import * as fs from "fs";
export const storePieceWise = function (piecewise: object) {
  fs.writeFileSync(
    "info/piecewise.json",
    JSON.stringify(piecewise, null, "\t")
  );
};
