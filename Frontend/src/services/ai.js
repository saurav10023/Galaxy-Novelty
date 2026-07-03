import ai from "../lib/gemini";

export async function generateProductDetails({
  category,
  productName,
  fields,
}) {
  const fieldInstructions = fields
    .map((field) => {
      if (field.type === "select") {
        return `
Field Name: ${field.key}
Description: ${field.label}
Type: Select
Allowed Values: ${field.options.join(", ")}
`;
      }

      if (field.type === "multiselect") {
        return `
Field Name: ${field.key}
Description: ${field.label}
Type: Array
Allowed Values: ${field.options.join(", ")}
`;
      }

      if (field.type === "boolean") {
        return `
Field Name: ${field.key}
Description: ${field.label}
Type: Boolean (true/false)
`;
      }

      return `
Field Name: ${field.key}
Description: ${field.label}
Type: ${field.type}
`;
    })
    .join("\n");

  const categoryFields = {};

  fields.forEach((field) => {
    if (field.type === "boolean") {
      categoryFields[field.key] = false;
    } else if (field.type === "multiselect") {
      categoryFields[field.key] = [];
    } else {
      categoryFields[field.key] = "";
    }
  });

  const prompt = `
You are an expert electronics catalogue assistant.

Category:
${category}

Product:
${productName}

Rules:

1. Never guess.
2. If unsure leave empty.
3. Never generate prices.
4. Never generate stock.
5. Return ONLY JSON.
6. Description should be 40-70 words.
7. Boolean fields true/false.
8. Multiselect fields arrays.
9. Select fields only from allowed values.

Fields:

${fieldInstructions}

Return exactly:

${JSON.stringify(
  {
    common: {
      name: productName,
      brand: "",
      description: "",
    },
    categoryFields,
  },
  null,
  2
)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  let text = response.text.trim();

  text = text.replace(/```json/g, "");
  text = text.replace(/```/g, "").trim();

  return JSON.parse(text);
}