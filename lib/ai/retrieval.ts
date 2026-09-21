/**
 * Local retrieval over an organization's knowledge base.
 *
 * This is what powers the assistant when no LLM key is configured, and it also
 * supplies the grounding context when one is. Ranking is BM25 with the question
 * field weighted above the answer body.
 *
 * Two additions make a purely lexical engine usable on real support questions,
 * where visitors rarely reuse the article's words:
 *
 *  - Synonym groups bridge support vocabulary ("money back" -> refund, "when
 *    will it arrive" -> shipping). They widen what can be *found*.
 *  - Confidence is IDF-weighted *coverage*: of the things the visitor actually
 *    asked about, how many does the winning article address — directly, or via
 *    a synonym? Full coverage scores high; a question where half the terms go
 *    unaddressed stays low and escalates, which is the behaviour that matters.
 *    Coverage is measured over the visitor's own words only, never over the
 *    expanded set, or a wide synonym group would dilute its own match.
 */

export type Article = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export type ScoredArticle = {
  article: Article;
  /** Raw BM25 score; only meaningful relative to other candidates. */
  score: number;
  /** 0..1 confidence, used to decide whether to answer or escalate. */
  normalized: number;
};

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "so", "of", "to",
  "in", "on", "at", "by", "for", "with", "from", "into", "about", "as", "is",
  "am", "are", "was", "were", "be", "been", "being", "do", "does", "did",
  "doing", "have", "has", "had", "having", "i", "me", "my", "we", "our", "us",
  "you", "your", "he", "him", "his", "she", "her", "they", "them", "their",
  "it", "its", "this", "that", "these", "those", "what", "which", "who",
  "whom", "when", "where", "why", "how", "can", "could", "will", "would",
  "should", "shall", "may", "might", "must", "please", "there", "here",
  "very", "just", "also", "any", "some", "all", "no", "not", "get", "got",
  "need", "want", "tell", "know", "like", "make", "take", "give", "go",
  "still", "even", "much", "many", "own", "too",
  // Conversational filler. These carry no retrieval signal, and because a
  // small corpus rarely contains them they would otherwise land on maximum
  // IDF and dominate the coverage score of an otherwise good match.
  "today", "tonight", "tomorrow", "yesterday", "now", "soon", "currently",
  "actually", "really", "maybe", "perhaps", "quickly", "thanks", "thank",
  "hello", "hi", "hey", "ok", "okay", "yes", "yeah", "sure", "guys",
]);

/**
 * Suffix stripping. Not a full Porter implementation, but it applies the two
 * rules Porter's step 1 needs to keep word families consistent: undouble a
 * final consonant after -ing/-ed, and drop a silent trailing -e. Without those
 * "pricing" and "price" land on different stems and never match.
 *
 * Ordered longest-first so "integrations" resolves through -ions, not -s.
 */
const SUFFIXES = [
  "ities", "ity", "ions", "ion", "ings", "ing", "edly", "ies", "ied",
  "ed", "es", "ly", "s", "y",
];

function stem(word: string): string {
  if (word.length <= 3) return word;

  let base = word;
  for (const suffix of SUFFIXES) {
    if (base.endsWith(suffix) && base.length - suffix.length >= 3) {
      base = base.slice(0, base.length - suffix.length);
      break;
    }
  }

  // "shipping" -> "shipp" -> "ship". Keep ll/ss/zz, which are real endings.
  const last = base.at(-1);
  if (
    base.length > 3 &&
    last &&
    base.at(-2) === last &&
    !"lsz".includes(last)
  ) {
    base = base.slice(0, -1);
  }

  // "price" -> "pric", matching "pricing" -> "pric".
  if (base.length > 3 && base.endsWith("e")) {
    base = base.slice(0, -1);
  }

  return base;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map(stem);
}

/**
 * Support-domain vocabulary. Every phrase in a group is treated as evidence
 * for every other phrase in it. Written in plain words and stemmed at module
 * load, so this table never contains hand-written stems.
 */
const SYNONYM_GROUPS: string[][] = [
  ["refund", "money back", "reimburse", "repay", "return my money"],
  ["hours", "open", "opening time", "closing time", "closed", "what time"],
  ["shipping", "delivery", "package", "parcel", "arrive", "dispatch", "tracking"],
  ["password", "log in", "login", "sign in", "locked out", "reset", "credentials"],
  ["billing", "invoice", "charge", "payment", "card", "receipt", "bill"],
  ["teammate", "team member", "colleague", "seat", "coworker", "invite"],
  ["encryption", "security", "privacy", "compliance", "soc 2", "gdpr", "certified"],
  ["export", "download my data", "backup", "archive"],
  ["integration", "connect", "api", "webhook", "plugin"],
  ["pricing", "cost", "how much", "discount", "plan", "quote"],
  ["mobile", "app", "ios", "android", "phone", "tablet"],
  ["order", "purchase", "buy", "checkout"],
  ["cancel", "stop", "terminate"],
  ["account", "profile", "settings"],
];

const SYNONYM_INDEX = (() => {
  /** Stemmed token -> group ids it belongs to. */
  const tokenToGroups = new Map<string, number[]>();
  /** Multi-word phrase (as typed) -> group id. */
  const phraseToGroup: [string, number][] = [];
  /** Group id -> every stemmed token in that group. */
  const groupTokens: string[][] = [];

  SYNONYM_GROUPS.forEach((group, groupId) => {
    const tokens = new Set<string>();

    for (const phrase of group) {
      for (const token of tokenize(phrase)) tokens.add(token);
      if (phrase.includes(" ")) phraseToGroup.push([phrase.toLowerCase(), groupId]);
    }

    groupTokens.push([...tokens]);
    for (const token of tokens) {
      const groups = tokenToGroups.get(token);
      if (groups) groups.push(groupId);
      else tokenToGroups.set(token, [groupId]);
    }
  });

  return { tokenToGroups, phraseToGroup, groupTokens };
})();

/** A synonym match is real evidence, but weaker than the visitor's own words. */
const SYNONYM_RANK_WEIGHT = 0.45;
/** How much of a term's coverage a synonym hit earns. */
const SYNONYM_COVERAGE_CREDIT = 0.8;

// BM25 tuning: k1 controls term-frequency saturation, b controls length
// normalization. These are the standard defaults and behave well on short docs.
const K1 = 1.5;
const B = 0.75;
const QUESTION_WEIGHT = 2.5;
/** Clamp the IDF used for coverage so one exotic token can't dominate. */
const COVERAGE_IDF_RANGE: [number, number] = [0.5, 2.5];
/**
 * Coverage is raised to this power before becoming confidence.
 *
 * Linear coverage is too strict: one stray unmatched word in a three-word
 * question caps confidence at 0.67 even when the article is plainly correct.
 * A sublinear curve forgives a single miss while still driving multi-miss
 * questions — the ones that genuinely need a human — well below the threshold.
 */
const COVERAGE_CURVE = 0.75;

export function rankArticles(
  query: string,
  articles: Article[],
  limit = 4
): ScoredArticle[] {
  const literalTerms = [...new Set(tokenize(query))];
  if (literalTerms.length === 0 || articles.length === 0) return [];

  const normalizedQuery = query.toLowerCase();

  // Which synonym groups this query touches, by token or by phrase.
  const triggeredGroups = new Set<number>();
  for (const term of literalTerms) {
    for (const groupId of SYNONYM_INDEX.tokenToGroups.get(term) ?? []) {
      triggeredGroups.add(groupId);
    }
  }
  for (const [phrase, groupId] of SYNONYM_INDEX.phraseToGroup) {
    if (normalizedQuery.includes(phrase)) triggeredGroups.add(groupId);
  }

  // Ranking set: the visitor's words at full weight, bridged terms discounted.
  const rankWeights = new Map<string, number>();
  for (const term of literalTerms) rankWeights.set(term, 1);
  for (const groupId of triggeredGroups) {
    for (const term of SYNONYM_INDEX.groupTokens[groupId]) {
      if (!rankWeights.has(term)) rankWeights.set(term, SYNONYM_RANK_WEIGHT);
    }
  }

  /** For coverage: each literal term's synonym siblings. */
  const siblings = new Map<string, string[]>();
  for (const term of literalTerms) {
    const groups = SYNONYM_INDEX.tokenToGroups.get(term) ?? [];
    const related = new Set<string>();
    for (const groupId of groups) {
      for (const sibling of SYNONYM_INDEX.groupTokens[groupId]) {
        if (sibling !== term) related.add(sibling);
      }
    }
    // A phrase-triggered group also vouches for the terms that triggered it.
    siblings.set(term, [...related]);
  }

  // Build the corpus per call. Small orgs only — swap for a persisted index or
  // embeddings if a knowledge base grows past a few thousand articles.
  const docs = articles.map((article) => {
    const questionTerms = tokenize(article.question);
    const answerTerms = tokenize(article.answer);

    const frequencies = new Map<string, number>();
    for (const term of questionTerms) {
      frequencies.set(term, (frequencies.get(term) ?? 0) + QUESTION_WEIGHT);
    }
    for (const term of answerTerms) {
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    }

    return {
      article,
      frequencies,
      length: questionTerms.length * QUESTION_WEIGHT + answerTerms.length,
      haystack: `${article.question} ${article.answer}`.toLowerCase(),
    };
  });

  const avgLength =
    docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length || 1;

  // Standard BM25 IDF with the +1 smoothing that keeps it positive.
  const idf = new Map<string, number>();
  for (const term of rankWeights.keys()) {
    const df = docs.filter((doc) => doc.frequencies.has(term)).length;
    idf.set(term, Math.log(1 + (docs.length - df + 0.5) / (df + 0.5)));
  }

  const coverageIdf = (term: string) => {
    const [min, max] = COVERAGE_IDF_RANGE;
    return Math.min(max, Math.max(min, idf.get(term) ?? max));
  };

  /** Denominator for coverage: everything the visitor asked about. */
  const askedWeight = literalTerms.reduce(
    (sum, term) => sum + coverageIdf(term),
    0
  );

  const scored = docs.map((doc) => {
    let score = 0;
    for (const [term, weight] of rankWeights) {
      const frequency = doc.frequencies.get(term);
      if (!frequency) continue;

      const denominator =
        frequency + K1 * (1 - B + (B * doc.length) / avgLength);
      score +=
        weight * (idf.get(term) ?? 0) * ((frequency * (K1 + 1)) / denominator);
    }

    // Reward literal phrase overlap — a visitor pasting an exact question
    // should land on that article even if the individual terms are common.
    if (doc.haystack.includes(normalizedQuery) && normalizedQuery.length > 12) {
      score *= 1.4;
    }

    let coveredWeight = 0;
    for (const term of literalTerms) {
      if (doc.frequencies.has(term)) {
        coveredWeight += coverageIdf(term);
        continue;
      }
      const bridged = (siblings.get(term) ?? []).some((sibling) =>
        doc.frequencies.has(sibling)
      );
      if (bridged) {
        coveredWeight += coverageIdf(term) * SYNONYM_COVERAGE_CREDIT;
      }
    }

    return {
      article: doc.article,
      score,
      coverage: askedWeight > 0 ? coveredWeight / askedWeight : 0,
    };
  });

  const ranked = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (ranked.length === 0) return [];

  const topScore = ranked[0].score;
  const runnerUpScore = ranked[1]?.score ?? 0;
  /** How decisively the winner beat the field. */
  const margin = topScore > 0 ? (topScore - runnerUpScore) / topScore : 0;

  return ranked.map((entry, index) => {
    // Coverage is the signal; the margin nudges the winner up a little, so a
    // clear match reads as more reliable than one of several near-ties.
    const confidence =
      Math.pow(entry.coverage, COVERAGE_CURVE) *
      (index === 0 ? 0.9 + 0.1 * margin : 0.85);

    return {
      article: entry.article,
      score: entry.score,
      normalized: Math.max(0, Math.min(1, confidence)),
    };
  });
}
