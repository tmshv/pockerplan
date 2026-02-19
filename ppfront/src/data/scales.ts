import type { EstimationScale } from "../types";

export const scales: EstimationScale[] = [
  {
    id: "fibonacci",
    name: "Fibonacci",
    values: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?"],
  },
  {
    id: "power_of_2",
    name: "Power of 2",
    values: ["1", "2", "4", "8", "16", "32", "64", "?"],
  },
  {
    id: "linear",
    name: "Linear",
    values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?"],
  },
  {
    id: "tshirt",
    name: "T-shirt",
    values: ["XS", "S", "M", "L", "XL", "XXL", "?"],
  },
];
