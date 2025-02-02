import { createExpenseInput, updateExpenseInput } from "../validation/index"; // Ensure these schemas are defined correctly
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";

export const expenseRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    },
    Variables: {
        userId: string;
    }
}>();

expenseRouter.use('/*', async (c, next) => {
    const header = c.req.header("authorization") || "";
    const token = header.split(" ")[1];

    if (!token) {
        c.status(403);
        return c.json({ error: "unauthorized" });
    }

    try {
        const response = await verify(token, c.env.JWT_SECRET);
        if (response.id) {
            //@ts-ignore
            c.set("userId", response.id);
            await next();
        } else {
            c.status(403);
            return c.json({ error: "unauthorized" });
        }
    } catch (e) {
        c.status(403);
        return c.json({ error: "unauthorized" });
    }
});

// POST route to create an expense
expenseRouter.post('/', async (c) => {
    try {
        //@ts-ignore
        const userId = c.get('userId');
        const prisma = new PrismaClient({
            datasourceUrl: c.env?.DATABASE_URL,
        }).$extends(withAccelerate());

        const body = await c.req.json();

        // Validate input using Zod schema
        const { success, error } = createExpenseInput.safeParse(body);
        if (!success) {
            c.status(400); // Bad Request
            return c.json({ message: "Invalid input", error });
        }

        const expense = await prisma.expense.create({
            data: {
                amount: body.amount,
                category: body.category,
                date: body.date,
                userId: parseInt(userId), // Ensure userId is properly converted
            },
        });

        return c.json({ id: expense.id });
    } catch (e) {
        c.status(500); // Internal Server Error
        return c.json({ error: "Internal server error" });
    }
});

// PUT route to update an expense
expenseRouter.put('/', async (c) => {
    const body = await c.req.json();
    const { success, error } = updateExpenseInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        });
    }

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    try {
        const expense = await prisma.expense.update({
            where: {
                id: body.id
            }, 
            data: {
                amount: body.amount,
                category: body.category,
                date: body.date
            }
        });

        return c.json({
            id: expense.id
        });
    } catch (e) {
        c.status(500); 
        return c.json({ error: "Internal server error" });
    }
});


expenseRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    try {
        const expenses = await prisma.expense.findMany({
            select: {
                amount: true,
                category: true,
                date: true,
                id: true,
                user: {
                    select: {
                        // name: true
                    }
                }
            }
        });

        return c.json({
            expenses
        });
    } catch (e) {
        c.status(500); // Internal Server Error
        return c.json({ error: "Internal server error" });
    }
});

// GET route to fetch a single expense
expenseRouter.get('/:id', async (c) => {
    const id = c.req.param("id");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    try {
        const expense = await prisma.expense.findFirst({
            where: {
                id: Number(id)
            },
            select: {
                id: true,
                amount: true,
                category: true,
                date: true,
                user: {
                    select: {
                        // name: true
                    }
                }
            }
        });

        return c.json({
            expense
        });
    } catch (e) {
        c.status(500); // Internal Server Error
        return c.json({
            message: "Error while fetching expense"
        });
    }
});
expenseRouter.get('/category-spending', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    try {
        // Fetch total spending per category
        const categorySpendings = await prisma.expense.groupBy({
            by: ['category'],
            _sum: {
                amount: true,
            },
        });

        // Calculate total spending
        const totalSpending = categorySpendings.reduce((total, category) => total + (category._sum.amount || 0), 0);

        // Calculate percentage distribution
        const categoryDistribution = categorySpendings.map((category) => ({
            category: category.category,
            amount: category._sum.amount || 0,
            percentage: ((category._sum.amount || 0) / totalSpending) * 100,
        }));

        return c.json({
            totalSpending,
            categoryDistribution,
        });
    } catch (e) {
        c.status(500); // Internal Server Error
        return c.json({ error: "Internal server error" });
    }
});
