export const ERROR_CATEGORIES = [
  { value: "", label: "None" },
  { value: "wrong_source", label: "Wrong Source" },
  { value: "hallucination", label: "Hallucination" },
  { value: "incomplete", label: "Incomplete" },
  { value: "irrelevant", label: "Irrelevant" },
  { value: "outdated", label: "Outdated Info" },
] as const;
