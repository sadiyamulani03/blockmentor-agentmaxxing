/**
 * BLOCKMENTOR CONCEPT BANK
 *
 * Local, deterministic knowledge used by the `explain_solidity_concept`,
 * `generate_quiz`, and `grade_quiz` tools. No external API, no wallet,
 * no randomness. Add a new concept by appending an object with an
 * explanation and a quiz.
 *
 * Quiz questions are tagged with a difficulty:
 *   beginner     — recall and basic syntax
 *   intermediate — usage patterns, common gotchas, reading snippets
 *   advanced     — edge cases, gas/security implications, design trade-offs
 * Difficulty labels are honest: a beginner question is never marked advanced.
 */

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: Difficulty;
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

export const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];
export const SUPPORTED_DIFFICULTIES: string[] = DIFFICULTIES;

export function isDifficulty(x: unknown): x is Difficulty {
  return typeof x === "string" && (DIFFICULTIES as string[]).includes(x);
}

/** Questions for one concept at one difficulty, in bank order (deterministic). */
export function questionsAtDifficulty(concept: Concept, difficulty: Difficulty): QuizQuestion[] {
  return concept.quiz.filter((q) => q.difficulty === difficulty);
}

/** How many questions exist per difficulty for a concept. */
export function difficultyCounts(concept: Concept): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { beginner: 0, intermediate: 0, advanced: 0 };
  for (const q of concept.quiz) counts[q.difficulty]++;
  return counts;
}

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
        difficulty: "beginner",
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
        difficulty: "beginner",
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
        difficulty: "beginner",
      },
      {
        question: "Which types can be used as mapping keys?",
        options: [
          "Only address and uint256",
          "Elementary/value types, bytes, string, and contract types",
          "Any struct or array",
          "Only string and bytes",
        ],
        answerIndex: 1,
        explanation:
          "Mapping keys must be value types (integers, bool, address, bytesNN, etc.), bytes, string, or contract types — not mappings, arrays, or structs.",
        difficulty: "beginner",
      },
      {
        question:
          "A never-written key in mapping(address => uint256) is read inside deposit tracking. What should the code expect?",
        options: [
          "A revert because the key is missing",
          "The zero value (0), so += works without an existence check",
          "Garbage from an uninitialized slot",
          "A compile error",
        ],
        answerIndex: 1,
        explanation:
          "Unset keys return 0, so `balances[user] += x` is safe even for first-time users — no explicit initialization is needed.",
        difficulty: "intermediate",
      },
      {
        question: "Your contract must list every address that ever called deposit(). What storage design works?",
        options: [
          "Loop over the mapping keys",
          "Keep a separate uint256[] of depositor addresses alongside the mapping",
          "Use mapping.length",
          "Read the keys from calldata",
        ],
        answerIndex: 1,
        explanation:
          "Mappings are not enumerable, so you maintain a secondary array (push on first deposit, optionally swap-and-pop on withdraw) if you need iteration.",
        difficulty: "intermediate",
      },
      {
        question: "What does `delete balances[msg.sender]` do?",
        options: [
          "Removes the key from the mapping entirely",
          "Resets the value at that key to the zero value",
          "Frees the storage slot and refunds ETH",
          "Reverts if the balance is non-zero",
        ],
        answerIndex: 1,
        explanation:
          "`delete` assigns the zero/default value — the key still 'exists' with value 0. The slot is not removed from the mapping's structure.",
        difficulty: "intermediate",
      },
      {
        question:
          "A dApp needs O(1) balance lookups AND a full list of users for airdrops. Best storage layout?",
        options: [
          "mapping(address => uint256) only",
          "address[] only",
          "mapping(address => uint256) balances plus uint256[] users kept in sync on join/leave",
          "mapping(address => mapping(address => uint256))",
        ],
        answerIndex: 2,
        explanation:
          "The mapping gives O(1) reads; the parallel array provides enumeration. Both must be updated together on join/leave to stay consistent.",
        difficulty: "advanced",
      },
      {
        question: "Which statement about mapping key types is FALSE in Solidity 0.8?",
        options: [
          "Contract types can be keys",
          "string and bytes can be keys",
          "Enum types can be keys",
          "Another mapping can be used as a key",
        ],
        answerIndex: 3,
        explanation:
          "Mappings cannot be keys (they are not value types). Contracts, enums, strings, bytes, and elementary value types are all valid keys.",
        difficulty: "advanced",
      },
      {
        question:
          "In a nested mapping mapping(address => mapping(address => uint256)) allowed, what does allowed[a][b] represent?",
        options: [
          "A single combined key (a,b) hashed together",
          "b's allowance granted by a (outer key a, inner key b)",
          "An array of allowances",
          "A compile error — nested mappings are illegal",
        ],
        answerIndex: 1,
        explanation:
          "Nested mappings chain lookups: outer key a selects an inner mapping, then key b selects the uint256. This is the standard ERC-20 allowance pattern.",
        difficulty: "advanced",
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
        difficulty: "beginner",
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
        difficulty: "beginner",
      },
      {
        question: "What does arr.length return for a dynamic array in storage?",
        options: [
          "The number of elements currently stored",
          "The allocated capacity",
          "The byte size of the array in memory",
          "Always 0 for storage arrays",
        ],
        answerIndex: 0,
        explanation:
          "For dynamic arrays, length is the current element count and is updated automatically by push/pop.",
        difficulty: "beginner",
      },
      {
        question: "You call scores.pop() on an empty dynamic array. What happens?",
        options: [
          "It does nothing",
          "It reverts",
          "It pushes 0",
          "It sets length to 2^256-1",
        ],
        answerIndex: 1,
        explanation: "pop() on an empty array reverts — always check length first.",
        difficulty: "intermediate",
      },
      {
        question:
          "uint256[3] memory a = [uint256(1), 2, 3]; then a[3] is evaluated. What does the compiler do?",
        options: [
          "Compile-time error (constant out-of-bounds index)",
          "Runtime revert",
          "Returns 0",
          "Returns uninitialized memory",
        ],
        answerIndex: 0,
        explanation:
          "With a fixed-size array and a constant index, Solidity catches the out-of-bounds access at compile time.",
        difficulty: "intermediate",
      },
      {
        question: "You must pass a large read-only array to an external function cheaply. Which location?",
        options: [
          "calldata — no copy is made",
          "storage — cheapest of all",
          "memory — always copied for free",
          "Location does not affect gas",
        ],
        answerIndex: 0,
        explanation:
          "calldata parameters are read in place with no copy; memory copies every element; storage would require the array to live in contract state.",
        difficulty: "intermediate",
      },
      {
        question: "How is a dynamic storage array laid out on-chain?",
        options: [
          "Elements occupy the slot p, p+1, p+2, ...",
          "Length is at slot p; elements start at keccak256(p)",
          "Elements are stored in a separate contract",
          "Dynamic arrays have no defined storage layout",
        ],
        answerIndex: 1,
        explanation:
          "The array length lives at its slot p; element i is at keccak256(p) + i — which is why index access is a hash, not p+i.",
        difficulty: "advanced",
      },
      {
        question:
          "Memory arrays have a fixed size at creation. How do you build a variable-length result in memory?",
        options: [
          "Use .push() on memory arrays",
          "Precompute the length, allocate with new T[](n), then fill; or collect into storage",
          "Memory arrays auto-grow when indexed",
          "Copy from calldata with .append()",
        ],
        answerIndex: 1,
        explanation:
          "Memory arrays cannot grow: allocate exactly the size you need with new uint256[](n) (or accumulate into storage).",
        difficulty: "advanced",
      },
      {
        question: "uint256[] storage b; then a = b; (both storage). What happens?",
        options: [
          "a and b become aliases of the same array",
          "All elements of b are deep-copied into a",
          "Compile error — storage-to-storage assignment is illegal",
          "Only the length is copied",
        ],
        answerIndex: 1,
        explanation:
          "Storage-to-storage assignment copies the full value (deep copy for arrays). After the copy, later changes to one do not affect the other.",
        difficulty: "advanced",
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
        difficulty: "beginner",
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
        difficulty: "beginner",
      },
      {
        question: "How do you read a struct member?",
        options: ["Dot notation: s.score", "Arrow: s->score", "Index: s[0]", "s::score"],
        answerIndex: 0,
        explanation: "Struct members use dot notation on a storage/memory/calldata reference.",
        difficulty: "beginner",
      },
      {
        question: "An internal function takes Student memory s and modifies s.score. What happens to the caller's storage struct?",
        options: [
          "The storage struct is updated too",
          "Nothing — memory is a copy; the storage struct is unchanged",
          "Compile error",
          "The storage struct is deleted",
        ],
        answerIndex: 1,
        explanation:
          "Passing as memory creates a copy; mutations stay in memory. To affect storage, pass a storage pointer or write back explicitly.",
        difficulty: "intermediate",
      },
      {
        question: "struct Order { uint256 id; uint256[] fills; } — where can Order live?",
        options: [
          "storage or memory",
          "storage only",
          "calldata only",
          "Nowhere — structs with arrays are illegal",
        ],
        answerIndex: 0,
        explanation:
          "A dynamic array member is fine in storage and memory. Only a mapping member forces storage-only.",
        difficulty: "intermediate",
      },
      {
        question: "struct S { uint256 a; uint256 b; } — which literals are valid?",
        options: [
          "Only S(1, 2)",
          "Only S{a: 1, b: 2}",
          "Both S(1, 2) and S{a: 1, b: 2}",
          "Neither — structs cannot be literals",
        ],
        answerIndex: 2,
        explanation:
          "Positional S(1, 2) and named S{a: 1, b: 2} are both valid struct literals (named form is clearer and safer).",
        difficulty: "intermediate",
      },
      {
        question: "An internal function returns `Student storage`. The caller receives:",
        options: [
          "A storage reference — later writes persist on-chain",
          "A memory copy",
          "A calldata reference",
          "Compile error — storage cannot be returned",
        ],
        answerIndex: 0,
        explanation:
          "Returning a storage pointer hands back a live reference into contract storage; mutations through it persist.",
        difficulty: "advanced",
      },
      {
        question:
          "Why can't an external function take a struct containing a mapping as an ABI parameter?",
        options: [
          "Gas limits on external calls",
          "Mappings cannot be ABI-encoded, so such structs are internal-only",
          "The compiler forbids structs in ABI generally",
          "Mappings were deprecated in 0.8",
        ],
        answerIndex: 1,
        explanation:
          "ABI has no representation for mappings; structs containing them cannot cross the external interface (internal functions are fine).",
        difficulty: "advanced",
      },
      {
        question:
          "struct A { uint128 x; uint128 y; } vs two separate uint128 state variables. Storage cost?",
        options: [
          "Identical — one slot either way",
          "The struct packs x and y into one slot; the separate variables also pack — same total",
          "The struct always costs more slots",
          "Depends on the optimizer version only",
        ],
        answerIndex: 1,
        explanation:
          "Both layouts pack two uint128s into a single 32-byte slot. Adjacent packing rules apply equally to struct members and state variables.",
        difficulty: "advanced",
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
        difficulty: "beginner",
      },
      {
        question: "Where does a contract's state variable actually live?",
        options: ["memory", "storage", "calldata", "cache"],
        answerIndex: 1,
        explanation:
          "State variables live in contract storage — persistent across transactions until written again.",
        difficulty: "beginner",
      },
      {
        question: "Which location survives between transactions?",
        options: ["storage", "memory", "calldata", "None — all are cleared"],
        answerIndex: 0,
        explanation:
          "Only storage persists on-chain across transactions; memory and calldata exist for the duration of a single call.",
        difficulty: "beginner",
      },
      {
        question: "function f(uint256[] calldata xs) { xs[0] = 1; } — what does the compiler do?",
        options: [
          "Allows it — calldata can be written",
          "Rejects it — calldata is read-only",
          "Copies to memory first",
          "Reverts at runtime",
        ],
        answerIndex: 1,
        explanation:
          "Writes to calldata are a compile-time error. Copy to memory first if you need to mutate: uint256[] memory m = xs;.",
        difficulty: "intermediate",
      },
      {
        question: "uint256[] storage s; ... uint256[] memory m = s; — what happened?",
        options: [
          "m is a reference to s",
          "All elements were copied from storage into a fresh memory array",
          "Compile error",
          "s was moved into memory",
        ],
        answerIndex: 1,
        explanation:
          "Assigning storage to memory performs a full element copy. Later writes to m do not touch s.",
        difficulty: "intermediate",
      },
      {
        question:
          "A cheap external view function only reads a string parameter. Which data location should it use?",
        options: [
          "calldata — no copy",
          "storage — persistent",
          "memory — always cheapest",
          "Any — gas is equal",
        ],
        answerIndex: 0,
        explanation:
          "calldata avoids copying the string entirely; memory would copy it into the call frame.",
        difficulty: "intermediate",
      },
      {
        question: "Which data location is allowed ONLY on function parameters?",
        options: ["calldata", "memory", "storage", "transient-only"],
        answerIndex: 0,
        explanation:
          "calldata is exclusively for external function inputs. State variables cannot be calldata; memory/storage have broader uses.",
        difficulty: "advanced",
      },
      {
        question: "Where do the members of `Student memory s` live?",
        options: ["memory — the whole struct is one memory object", "storage", "calldata", "split across locations"],
        answerIndex: 0,
        explanation:
          "A struct's location applies to all its members: a memory struct keeps every member in that memory frame.",
        difficulty: "advanced",
      },
      {
        question:
          "for (uint256 i; i < a.length; i++) sum += a[i];  where a is a large storage array. Best gas fix?",
        options: [
          "Cache the length: uint256 len = a.length; loop on i < len (optionally unchecked i++)",
          "Switch a to memory inside the loop",
          "Use tx.origin checks",
          "Nothing — storage reads are free",
        ],
        answerIndex: 0,
        explanation:
          "a.length is an SLOAD every iteration when written that way; caching length in a local (and careful unchecked increments) removes repeated storage reads.",
        difficulty: "advanced",
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
        difficulty: "beginner",
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
        difficulty: "beginner",
      },
      {
        question: "Inside a constructor, msg.sender is:",
        options: [
          "The address that deployed the contract",
          "address(0)",
          "The block proposer",
          "The first caller after deployment",
        ],
        answerIndex: 0,
        explanation:
          "During deployment msg.sender is the deployer — an EOA, or a factory contract if one created this contract.",
        difficulty: "beginner",
      },
      {
        question: "A factory contract F deploys your contract. Inside the constructor, msg.sender is:",
        options: ["The EOA that called F", "F itself", "address(0)", "The current block's miner"],
        answerIndex: 1,
        explanation:
          "The immediate caller of the constructor is the factory. To record the original EOA you need it passed in as a parameter.",
        difficulty: "intermediate",
      },
      {
        question: "A delegatecall from A into library B: inside B, msg.sender is:",
        options: [
          "The original external caller of A",
          "A",
          "B",
          "address(0)",
        ],
        answerIndex: 0,
        explanation:
          "delegatecall preserves the caller context: msg.sender (and storage) remain A's — which is why delegatecall libraries can mutate caller state.",
        difficulty: "intermediate",
      },
      {
        question: "For a direct EOA call with no intermediate contracts, how do msg.sender and tx.origin compare?",
        options: [
          "They are equal",
          "msg.sender is the contract, tx.origin the EOA",
          "msg.sender is always zero",
          "They differ by the chain id",
        ],
        answerIndex: 0,
        explanation:
          "With no contracts in between, the immediate caller and the original EOA are the same address — equality only holds in this simple case.",
        difficulty: "intermediate",
      },
      {
        question: "Which pattern correctly restricts a function to a trusted collaborator contract?",
        options: [
          "require(tx.origin == trusted)",
          "Store the trusted address and require(msg.sender == trusted)",
          "Require(block.coinbase == trusted)",
          "Check msg.data.length > 0",
        ],
        answerIndex: 1,
        explanation:
          "Comparing msg.sender against a stored trusted address survives nested calls and is not phishable the way tx.origin is.",
        difficulty: "advanced",
      },
      {
        question: "In an ERC-2771-style meta-transaction flow, what is msg.sender inside the target contract?",
        options: [
          "The end user — the forwarder reconciles it",
          "The forwarder contract, unless code restores the original _msgSender()",
          "Always address(0)",
          "The relayer EOA that paid gas",
        ],
        answerIndex: 1,
        explanation:
          "Without extra logic, msg.sender is the trusted forwarder; ERC-2771 contracts append logic to recover the user as _msgSender().",
        difficulty: "advanced",
      },
      {
        question: "Inside a receive() function triggered by a plain ETH transfer, msg.sender is:",
        options: [
          "The address sending the ETH",
          "The receiving contract itself",
          "address(0)",
          "Whoever called the last non-payable function",
        ],
        answerIndex: 0,
        explanation:
          "msg.sender is whoever sent the transfer — an EOA or a contract that used .call{value: amount}(\"\").",
        difficulty: "advanced",
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
        difficulty: "beginner",
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
        difficulty: "beginner",
      },
      {
        question: "assert() is intended for:",
        options: [
          "Validating user input",
          "Checking internal invariants that should never fail",
          "Logging warnings",
          "Skipping gas payment",
        ],
        answerIndex: 1,
        explanation:
          "assert documents internal invariants (bugs if they fail). Use require/revert for anything a user or external input can trigger.",
        difficulty: "beginner",
      },
      {
        question: "Since Solidity 0.8, uint256 overflow in x += 1 does what?",
        options: [
          "Wraps around to 0",
          "Triggers a panic (arithmetic overflow revert)",
          "Silently saturates",
          "Is allowed only in unchecked blocks",
        ],
        answerIndex: 1,
        explanation:
          "Checked arithmetic is the default in 0.8+; overflow/underflow panics and reverts. unchecked { } opts out deliberately.",
        difficulty: "intermediate",
      },
      {
        question: "A contract defines error InsufficientBalance(uint256 requested, uint256 available). How does a caller see those values?",
        options: [
          "They cannot — revert data is discarded",
          "Catch in Solidity via try/catch, or decode the revert data off-chain",
          "They appear in a public event automatically",
          "Only via assert",
        ],
        answerIndex: 1,
        explanation:
          "Custom error data is returned in the revert payload; Solidity try/catch can read it (for external calls) and off-chain tools decode it from receipts.",
        difficulty: "intermediate",
      },
      {
        question: "Which check style best validates untrusted user input?",
        options: [
          "assert(input > 0)",
          "require(input > 0, \"input must be > 0\") or a custom error",
          "if (input > 0) { } with no revert",
          "Comment it and hope",
        ],
        answerIndex: 1,
        explanation:
          "Input checks must revert on failure — require/revert with a clear message (or custom error). assert is for invariants, not user input.",
        difficulty: "intermediate",
      },
      {
        question: "In Solidity, try/catch can catch reverts from:",
        options: [
          "Any internal function call",
          "External calls and contract creation only",
          "Only assert failures",
          "Only require with string messages",
        ],
        answerIndex: 1,
        explanation:
          "try/catch works on external calls (and new Contract(...)); internal reverts propagate and cannot be caught that way.",
        difficulty: "advanced",
      },
      {
        question: "A panic with code 0x11 after arithmetic indicates:",
        options: [
          "An assert failure (0x01 is generic panic)",
          "Arithmetic overflow or underflow",
          "Division by zero (0x12)",
          "An invalid enum value (0x21)",
        ],
        answerIndex: 1,
        explanation:
          "Panic 0x11 = arithmetic overflow/underflow; 0x12 = division/modulo by zero; 0x01 = generic panic (e.g. assert).",
        difficulty: "advanced",
      },
      {
        question:
          "You call an untrusted external contract and must not let its revert brick your flow. Best practice?",
        options: [
          "Assume the call always succeeds",
          "Use a low-level call and handle the success flag, or try/catch with explicit failure handling",
          "Wrap everything in assert",
          "Check tx.origin first",
        ],
        answerIndex: 1,
        explanation:
          "External calls can revert arbitrarily: use try/catch (or call + success check) and decide explicitly what to do on failure.",
        difficulty: "advanced",
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
