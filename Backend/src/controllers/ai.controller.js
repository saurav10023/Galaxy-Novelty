import ai from "../config/gemini.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Retries once on 429 (rate limit) with a short delay before giving up.
async function generateWithRetry(prompt, retries = 2) {
    try {
        return await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });
    } catch (err) {
        if (err.status === 429 && retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return generateWithRetry(prompt, retries - 1);
        }
        throw err;
    }
}

export const generateProductDetails = async (req, res) => {
    console.log("✅ AI Controller Hit");
    try {
        console.log("✅ AI Controller Hit");
        const { category, productName, fields } = req.body;

        if (!category) {
            return res.status(400).json({
                success: false,
                message: "Category is required."
            });
        }

        if (!productName) {
            return res.status(400).json({
                success: false,
                message: "Product name is required."
            });
        }

        if (!fields || !Array.isArray(fields)) {
            return res.status(400).json({
                success: false,
                message: "Fields are required."
            });
        }

        // Build instructions for AI
        const fieldInstructions = fields
            .map((field) => {

                if (field.type === "select") {
                    return `
Field Name : ${field.key}
Description : ${field.label}
Type : Select
Allowed Values : ${field.options.join(", ")}
`;
                }

                if (field.type === "multiselect") {
                    return `
Field Name : ${field.key}
Description : ${field.label}
Type : Array
Allowed Values : ${field.options.join(", ")}
`;
                }

                if (field.type === "boolean") {
                    return `
Field Name : ${field.key}
Description : ${field.label}
Type : Boolean (true/false)
`;
                }

                return `
Field Name : ${field.key}
Description : ${field.label}
Type : ${field.type}
`;
            })
            .join("\n");

        // Empty object according to field types
        const categoryFields = {};

        fields.forEach((field) => {

            if (field.type === "boolean") {
                categoryFields[field.key] = false;
            }
            else if (field.type === "multiselect") {
                categoryFields[field.key] = [];
            }
            else {
                categoryFields[field.key] = "";
            }

        });

        const prompt = `
You are an expert electronics catalogue assistant.

Your task is to identify the specifications of the given product.

Category:

${category}

Product Name:

${productName}

============================

VERY IMPORTANT RULES

1. Never guess specifications.

2. If you are not at least 95% confident,
leave the value empty.

3. Never generate prices.

4. Never generate stock.

5. Never explain anything.

6. Return ONLY JSON.

7. Boolean fields must be true or false.

8. Multiselect fields must be arrays.

9. Select fields MUST use one of the allowed values only.

10. Description should be around 40-70 words.

============================

Fill these fields:

${fieldInstructions}

============================

Return JSON exactly like this:

${JSON.stringify({
            common: {
                name: productName,
                brand: "",
                description: ""
            },
            categoryFields
        }, null, 2)}

Do not add any extra text.
`;

        const response = await generateWithRetry(prompt);

        let text = (response.text || "").trim();

        // Remove markdown if model accidentally returns it
        text = text.replace(/```json/g, "");
        text = text.replace(/```/g, "").trim();

        const data = JSON.parse(text);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.error(error);

        if (error.status === 429) {
            return res.status(429).json({
                success: false,
                message: "AI service is busy right now. Please try again in a moment."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to generate product details."
        });

    }
};

export const sayHello = asyncHandler(async (req,res)=> {
    return res.status(200).json(new ApiResponse(200 , "done"))
})