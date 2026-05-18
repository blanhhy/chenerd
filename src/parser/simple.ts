import type { ParseResult, Cardinality } from "../types";

export function parseSimpleSyntax(input: string): ParseResult {
  const tables: ParseResult["tables"] = [];
  const relationships: ParseResult["relationships"] = [];

  const lines = input.trim().split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    if (trimmedLine.startsWith("entity ")) {
      parseEntityLine(trimmedLine, tables);
    } else if (trimmedLine.includes("--")) {
      parseRelationshipLine(trimmedLine, relationships);
    }
  }

  return { tables, relationships };
}

function parseEntityLine(line: string, tables: ParseResult["tables"]) {
  const match = line.match(/entity\s+(\S+)\s*\{(.+)\}/);
  if (match) {
    const name = match[1].trim();
    const attrs = match[2]
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a);

    const columns = attrs.map((attrName) => ({
      name: attrName,
      type: "text",
      isPrimaryKey: attrName.includes("号") || attrName.includes("ID") || attrName.includes("id"),
    }));

    tables.push({
      name,
      columns,
      primaryKeys: columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
      foreignKeys: [],
    });
  }
}

function parseRelationshipLine(line: string, relationships: ParseResult["relationships"]) {
  const patterns = [
    /^(\S+)\s+(\S*)--([^-]+)--(\S*)\s+(\S+)$/,
    /^(\S+)\s*--([^-]+)--\s*(\S+)$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      if (match.length === 4) {
        relationships.push({
          from: match[1],
          to: match[3],
          label: match[2].trim() || "关联",
          fromCardinality: "1" as Cardinality,
          toCardinality: "1" as Cardinality,
        });
      } else if (match.length === 6) {
        const fromCard = match[2] || "N";
        const toCard = match[4] || "1";

        let finalFromCard = (fromCard === "1" ? "1" : "N") as Cardinality;
        let finalToCard = (toCard === "1" ? "1" : "N") as Cardinality;

        if (finalFromCard === "N" && finalToCard === "N") {
          finalToCard = "M" as Cardinality;
        }

        relationships.push({
          from: match[1],
          to: match[5],
          label: match[3].trim() || "关联",
          fromCardinality: finalFromCard,
          toCardinality: finalToCard,
        });
      }
      break;
    }
  }
}