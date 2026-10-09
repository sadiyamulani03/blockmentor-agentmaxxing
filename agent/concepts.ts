/**
 * BLOCKMENTOR CONCEPT BANK
 *
 * Local, deterministic knowledge used by the `explain_solidity_concept`
 * and `generate_quiz` tools. No external API, no wallet, no randomness.
 * Add a new concept by appending an object with an explanation and a quiz.
 */

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type Concept = {
  id: string;
  title: string;
  aliases: string[];
  summary: string;
  syntax: string;
  keyPoints: string[];
  example: string;
  commonMistakes: string[];
  quiz: QuizQuestion[];
};

export const CONCEPTS: Concept[] = [
  {
    id: "mappings",
    title: "Solidity mappings",
    aliases: ["mapping", "mappings", "solidity mappings", "hash map", "hashtable"],
    summary:
      "A mapping is Solidity's key-value hash table: mapping(KeyType => ValueType). It stores values on-chain keyed by an elementary type and is the most common way to track balances, flags, and lookups.",
    syntax: "mapping(address => uint256) public balances;",
    keyPoints: [
      "Declared with mapping(KeyType => ValueType); keys are value types, bytes, string, or contracts.",
      "Every key always exists with a zero/default value — there is no 'unset' key.",
      "Keys cannot be enumerated: you cannot loop over a mapping or ask its size.",
      "Stored in contract storage; reading is cheap, writing costs gas.",
    ],
    example:
      'mapping(address => uint256) balances;\n\nfunction deposit() external payable {\n  balances[msg.sender] += msg.value;\n}\n\nfunction balanceOf(address user) external view returns (uint256) {\n  return balances[user]; // returns 0 if never set\n}',
    commonMistakes: [
      "Trying to iterate a mapping or read .length — not possible; keep a separate array of keys if you must enumerate.",
      "Assuming a never-written key is 'missing' — it silently returns the zero value.",
    ],
    quiz: [
      {
        question: "Which statement about Solidity mappings is true?",
        options: [
          "You can loop over all of their keys",
          "Every key exists with a zero/default value even if never written",
          "They can be returned directly from an external function",
          "Keys are stored in insertion order",
        ],
        answerIndex: 1,
        explanation:
          "Mappings pre-initialize every possible key to the zero value (0, false, address(0), etc.), so reads never fail. They are unordered and non-enumerable.",
      },
      {
        question: "What is the correct syntax for a mapping from address to uint256?",
        options: [
          "mapping(address, uint256)",
          "mapping[address => uint256]",
          "mapping(address => uint256)",
          "map(address to uint256)",
        ],
        answerIndex: 2,
        explanation: "Mappings use parentheses with '=>' inside: mapping(KeyType => ValueType).",
      },
      {
        question: "You read a key that was never assigned. What do you get?",
        options: [
          "A compile error",
          "A runtime revert",
          "The zero value for the value type",
          "The most recently written value",
        ],
        answerIndex: 2,
        explanation:
          "Unset keys return the default zero value for the value type (0 for uint, address(0) for address, false for bool).",
      },
    ],
  },
  {
    id: "arrays",
    title: "Solidity arrays",
    aliases: ["array", "arrays", "dynamic array", "fixed array"],
    summary:
      "Arrays hold a contiguous list of values. Fixed-size arrays have a length set at declaration; dynamic arrays grow and shrink with push/pop and track their length automatically.",
    syntax: "uint256[] public scores;            // dynamic\nuint256[3] public fixedRow;         // fixed size",
    keyPoints: [
      "Dynamic arrays: uint256[] arr; with arr.push(x), arr.pop(), arr.length.",
      "Fixed arrays: uint256[3] arr; length never changes.",
      "Arrays live in storage, memory, or calldata — copying between them costs gas.",
      "Index access is bounds-checked in 0.8+: out-of-range reverts.",
    ],
    example:
      "uint256[] public scores;\n\nfunction addScore(uint256 s) external {\n  scores.push(s);\n}\n\nfunction top() external view returns (uint256) {\n  return scores.length == 0 ? 0 : scores[scores.length - 1];\n}",
    commonMistakes: [
      "Assuming arr.pop() on an empty array is safe — it reverts.",
      "Copying large storage arrays to memory unintentionally — each element costs gas.",
    ],
    quiz: [
      {
        question: "Which method grows a dynamic array in Solidity?",
        options: [".add()", ".push()", ".append()", ".insert()"],
        answerIndex: 1,
        explanation: "Dynamic arrays use .push(value) to append and .pop() to remove the last element.",
      },
      {
        question: "What happens when you read arr[10] on a 3-element array (Solidity >= 0.8)?",
        options: [
          "Returns 0",
          "Returns garbage",
          "Reverts (out-of-bounds)",
          "Wraps to index 0",
        ],
        answerIndex: 2,
        explanation:
          "Solidity 0.8+ bounds-checks array reads; an out-of-range index reverts instead of returning undefined data.",
      },
    ],
  },
  {
    id: "structs",
    title: "Solidity structs",
    aliases: ["struct", "structs", "structure", "structures"],
    summary:
      "A struct groups several variables into one custom type — for example a user profile or an order. Structs make contracts readable and let you pass complex records around.",
    syntax: "struct Student {\n  string name;\n  uint256 score;\n  bool active;\n}",
    keyPoints: [
      "Declared with struct Name { ... }; then used as a type: Student s;",
      "Can be stored in storage (on-chain), memory (temporary), or calldata (read-only input).",
      "Structs may contain mappings and arrays, but a struct containing a mapping must live in storage.",
      "Members are accessed with dot notation: s.score.",
    ],
    example:
      'struct Student {\n  string name;\n  uint256 score;\n}\n\nmapping(uint256 => Student) public students;\n\nfunction enroll(uint256 id, string memory name) external {\n  students[id] = Student({ name: name, score: 0 });\n}',
    commonMistakes: [
      "Returning a storage struct directly from an external function without copying — mark public getters carefully.",
      "Forgetting that strings inside structs cost extra gas for storage.",
    ],
    quiz: [
      {
        question: "Where must a struct containing a mapping be stored?",
        options: ["memory", "storage", "calldata", "anywhere"],
        answerIndex: 1,
        explanation:
          "Mappings can only exist in storage, so a struct that contains one must be placed in storage too.",
      },
      {
        question: "Which syntax correctly declares a struct in Solidity?",
        options: [
          "struct Student = { name: string }",
          "class Student { string name }",
          "struct Student { string name; }",
          "type Student { string name }",
        ],
        answerIndex: 2,
        explanation: "Solidity uses struct Name { members; } — fields end with semicolons, no equals sign.",
      },
    ],
  },
  {
    id: "data-locations",
    title: "Solidity data locations (storage/memory/calldata)",
    aliases: [
      "storage",
      "memory",
      "calldata",
      "data location",
      "data locations",
      "storage vs memory",
      "storage memory calldata",
    ],
    summary:
      "Every complex value in Solidity lives in one of three places: storage (persistent, on-chain, expensive), memory (temporary, per call, cheap), or calldata (read-only function arguments, cheapest).",
    syntax: "function f(uint256[] calldata in, uint256[] memory out) external pure { ... }",
    keyPoints: [
      "storage: permanent contract state; writes cost the most gas.",
      "memory: exists only during a call; is cleared afterward.",
      "calldata: input-only, read-only, cannot be modified — best for external function parameters.",
      "Assigning storage to memory copies the data; assigning memory to storage also copies.",
    ],
    example:
      "function sum(uint256[] calldata xs) external pure returns (uint256) {\n  uint256[] memory copy = xs; // calldata -> memory copy\n  uint256 total = 0;\n  for (uint256 i = 0; i < copy.length; i++) total += copy[i];\n  return total;\n}",
    commonMistakes: [
      "Using memory for public state variables — state is always storage.",
      "Mutating calldata — the compiler rejects writes to calldata values.",
    ],
    quiz: [
      {
        question: "Which data location is read-only and cheapest for external function inputs?",
        options: ["storage", "memory", "calldata", "stack"],
        answerIndex: 2,
        explanation:
          "calldata is read-only function input — it is never copied and costs the least gas.",
      },
      {
        question: "Where does a contract's state variable actually live?",
        options: ["memory", "storage", "calldata", "cache"],
        answerIndex: 1,
        explanation:
          "State variables live in contract storage — persistent across transactions until written again.",
      },
    ],
  },
  {
    id: "msg-sender",
    title: "msg.sender",
    aliases: ["msg.sender", "msg sender", "sender", "tx.origin", "caller"],
    summary:
      "msg.sender is the address that called the current function — the direct caller (an EOA or another contract). It is the standard way to implement ownership and per-user state.",
    syntax: "require(msg.sender == owner, \"not owner\");",
    keyPoints: [
      "msg.sender is the immediate caller of this call/transaction.",
      "In a constructor it is the deployer.",
      "tx.origin is the original EOA — never use it for authorization (phishing-prone).",
      "For per-user balances use mapping(address => uint256) keyed by msg.sender.",
    ],
    example:
      "address public owner;\n\nconstructor() {\n  owner = msg.sender;\n}\n\nfunction withdraw() external {\n  require(msg.sender == owner, \"not owner\");\n  // ...\n}",
    commonMistakes: [
      "Authorizing with tx.origin — a malicious contract can trick a user into calling it.",
      "Forgetting msg.sender changes across nested calls (contract A calling B makes B's msg.sender = A).",
    ],
    quiz: [
      {
        question: "Contract X calls contract Y. Inside Y, what is msg.sender?",
        options: [
          "The user who started the transaction",
          "Address X",
          "address(0)",
          "The block miner",
        ],
        answerIndex: 1,
        explanation:
          "msg.sender is the immediate caller — inside Y that is X. The original user remains tx.origin.",
      },
      {
        question: "Why should tx.origin not be used for access control?",
        options: [
          "It is always address(0)",
          "It costs too much gas",
          "A malicious contract can phish the user into calling it and pass the check",
          "It changes after 24 hours",
        ],
        answerIndex: 2,
        explanation:
          "tx.origin is the original EOA, so if a user is tricked into calling an attacker contract, tx.origin still equals the user and authorization passes.",
      },
    ],
  },
  {
    id: "error-handling",
    title: "Solidity error handling (require/revert/assert)",
    aliases: [
      "require",
      "revert",
      "assert",
      "error handling",
      "require revert assert",
      "custom errors",
      "modifiers guard",
    ],
    summary:
      "Solidity guards logic with require(condition, msg) for input checks, revert for custom failures, and assert for internal invariants. Failed checks revert the whole transaction and refund unused gas.",
    syntax: 'require(msg.value >= price, "insufficient payment");\nif (bad) revert Unauthorized();',
    keyPoints: [
      "require(condition, message): validates inputs/preconditions; reverts with the message if false.",
      "revert('msg') or custom errors (error Unauthorized();): abort with structured data — cheaper than require strings.",
      "assert(condition): for internal invariants (bugs) — consumes remaining gas in pre-0.8 style semantics.",
      "Since Solidity 0.8, arithmetic overflows automatically revert — SafeMath is no longer needed.",
    ],
    example:
      "error InsufficientBalance(uint256 requested, uint256 available);\n\nfunction withdraw(uint256 amount) external {\n  require(amount > 0, \"amount must be > 0\");\n  if (balances[msg.sender] < amount) {\n    revert InsufficientBalance(amount, balances[msg.sender]);\n  }\n  balances[msg.sender] -= amount;\n}",
    commonMistakes: [
      "Using assert for user-input checks — use require/revert; assert is for invariants.",
      "Relying on string messages everywhere — custom errors are cheaper on gas.",
    ],
    quiz: [
      {
        question: "Which statement is true when a require() fails?",
        options: [
          "Only the current function stops",
          "The whole transaction reverts and state changes are undone",
          "Gas is still consumed fully",
          "The error is logged on-chain",
        ],
        answerIndex: 1,
        explanation:
          "A failed require/revert aborts the entire transaction, rolling back every state change made so far.",
      },
      {
        question: "What is the main benefit of custom errors over require strings?",
        options: [
          "They run faster in the EVM",
          "They cost less gas and can carry structured parameters",
          "They prevent reverts",
          "They work only in constructors",
        ],
        answerIndex: 1,
        explanation:
          "Custom errors (error InsufficientBalance(...)) encode compactly and can return typed values, costing less gas than long revert strings.",
      },
    ],
  },
];

const normalize = (s: unknown): string =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();

export const SUPPORTED_CONCEPTS: string[] = CONCEPTS.map((c) => c.title);

/** Match user input to a concept by id, alias, or substring. Null if unknown. */
export function findConcept(input: unknown): Concept | null {
  const q = normalize(input);
  if (!q) return null;
  for (const c of CONCEPTS) {
    const keys = [c.id.replace(/-/g, " "), c.title, ...c.aliases].map(normalize);
    if (keys.includes(q)) return c;
  }
  for (const c of CONCEPTS) {
    const keys = [c.id.replace(/-/g, " "), c.title, ...c.aliases].map(normalize);
    if (keys.some((k) => k.includes(q) || q.includes(k))) return c;
  }
  return null;
}
