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

    // 解析主键标记：
    // - 默认第一个字段为主键（向后兼容）
    // - * 前缀标记主键，支持单主键或多主键（联合主键）
    // 示例: *学号, *课程号  表示联合主键
    const pkFields: string[] = [];
    const columns = attrs.map((attrName) => {
      let isPK = false;

      // 检查是否以 * 开头标记为主键
      if (attrName.startsWith("*")) {
        isPK = true;
        attrName = attrName.slice(1).trim();
      }

      const column = {
        name: attrName,
        type: "text",
        isPrimaryKey: isPK,
      };

      if (isPK) {
        pkFields.push(attrName);
      }

      return column;
    });

    // 如果没有显式标记主键，默认第一个字段为主键
    if (pkFields.length === 0 && columns.length > 0) {
      columns[0].isPrimaryKey = true;
      pkFields.push(columns[0].name);
    }

    tables.push({
      name,
      columns,
      primaryKeys: pkFields,
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