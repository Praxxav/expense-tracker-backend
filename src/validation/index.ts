import z from "zod";

// Signup Input Schema
export const signupInput = z.object({
    username: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional()
});

export type SignupInput = z.infer<typeof signupInput>;

// Create Expense Input Schema
export const createExpenseInput = z.object({
    amount: z.number().positive(), // Amount must be a positive number
    category: z.string().min(1),    // Category must be a non-empty string
    date: z.string().optional()      // Date is optional
}); 

export type CreateExpenseInput = z.infer<typeof createExpenseInput>; // Corrected type name

// Update Expense Input Schema
export const updateExpenseInput = z.object({
    id: z.number().int().positive(), // ID must be a positive integer
    amount: z.number().positive().optional(), // Amount is optional but must be positive if provided
    category: z.string().min(1).optional(), // Category is optional but must be non-empty if provided
    date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid date format", // Validate that the date is in a valid format
    }).optional(), // Date is optional but must be valid if provided
    description: z.string().optional(), // Description is optional
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseInput>;

// Signin Input Schema
export const signinInput = z.object({
    username: z.string().email(),
    password: z.string().min(6),
});

export type SigninInput = z.infer<typeof signinInput>;

// Create Blog Input Schema
export const createBlogInput = z.object({
    title: z.string(),
    content: z.string(),
});

export type CreateBlogInput = z.infer<typeof createBlogInput>;

// Update Blog Input Schema
export const updateBlogInput = z.object({
    title: z.string(),
    content: z.string(),
    id: z.number()
});

export type UpdateBlogInput = z.infer<typeof updateBlogInput>;