import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

const baseOptions = {
    discriminatorKey: "category",
    timestamps: true
};

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        sparse: true,   // allows multiple docs to have no slug without colliding
        trim: true,
        lowercase: true
    },
    brand: {
        type: String,
        trim: true,
        index: true
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,   // allows multiple docs to have no sku without colliding
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    images: [
        {
            url: { type: String, required: true },
            publicId: { type: String, required: true }
        }
    ],

    pricing: {
        purchasePrice: { type: Number, required: true }, // admin-only
        sellingPrice: { type: Number, required: true, index: true }, // for price sort/filter
        negotiation: {
            minPrice: Number,
            maxPrice: Number
        }
    },

    stock: {
        type: Number,
        default: 0,
        min: 0
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, baseOptions);

// Auto-generate slug from name (and a random sku) if not explicitly provided.
productSchema.pre("save", async function () {
    if (!this.slug && this.name) {
        const baseSlug = this.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        let candidate = baseSlug;
        let suffix = 1;

        const Model = mongoose.model("Product");

        // guard against collisions from two products with the same name
        while (await Model.exists({ slug: candidate, _id: { $ne: this._id } })) {
            candidate = `${baseSlug}-${suffix++}`;
        }

        this.slug = candidate;
    }

    if (!this.sku) {
        this.sku = `SKU-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    }
});

// Pricing sanity checks
productSchema.pre("save", async function () {
    if (!this.slug && this.name) {
        const baseSlug = this.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        let candidate = baseSlug;
        let suffix = 1;

        const Model = mongoose.model("Product");

        while (await Model.exists({ slug: candidate, _id: { $ne: this._id } })) {
            candidate = `${baseSlug}-${suffix++}`;
        }

        this.slug = candidate;
    }

    if (!this.sku) {
        this.sku = `SKU-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    }
    // no next() — the resolved promise IS the "done" signal
});

export const Product = mongoose.model("Product", productSchema);