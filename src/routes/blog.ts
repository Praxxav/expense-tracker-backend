import { createBlogInput, updateBlogInput } from "@praxav99/medium-common";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";

export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    }, 
    Variables: {
        userId: string;
    }
}>();

blogRouter.use('/*', async (c, next) => {
	const header = c.req.header("authorization") || "";
	const token = header.split(" ")[1]
   
    if (!token) {
        console.error("Authorization header missing or malformed");
        c.status(403);
        return c.json({ error: "unauthorized" });
    }
	try {
		const response = await verify(token, c.env.JWT_SECRET);
		if (response.id) {
			c.set("jwtPayload", response.id);
			await next()
		} else {
			c.status(403);
			return c.json({ error: "unauthorized" })
		}
	} catch (e) {
		c.status(403);
		return c.json({ error: "unauthorized" })
	}

})

blogRouter.post('/', async (c) => {
	try {
		//@ts-ignore
		const userId = c.get('userId');
		const prisma = new PrismaClient({
			datasourceUrl: c.env?.DATABASE_URL,
		}).$extends(withAccelerate());

		const body = await c.req.json();

		// Validate input using Zod schema
		const { success, error } = createBlogInput.safeParse(body);
		if (!success) {
			console.error("Validation error:", error);
			c.status(400); // Bad Request
			return c.json({ message: "Invalid input", error });
		}

		const blog = await prisma.blog.create({
			data: {
				title: body.title,
				content: body.content,
				authorId: parseInt(userId), // Ensure userId is properly converted
			},
		});

		return c.json({ id: blog.id });
	} catch (e) {
		console.error("Error creating blog:", e);
		
	}
});

blogRouter.put('/', async (c) => {
    const body = await c.req.json();
    const { success } = updateBlogInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        })
    }

    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const blog = await prisma.blog.update({
        where: {
            id: body.id
        }, 
        data: {
            title: body.title,
            content: body.content
        }
    })

    return c.json({
        id: blog.id
    })
})

// Todo: add pagination
blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    const blogs = await prisma.blog.findMany({
        select: {
            content: true,
            title: true,
            id: true,
            author: {
                select: {
                    name: true
                }
            }
        }
    });

    return c.json({
        blogs
    })
})

blogRouter.get('/:id', async (c) => {
    const id = c.req.param("id");
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    try {
        const blog = await prisma.blog.findFirst({
            where: {
                id: Number(id)
            },
            select: {
                id: true,
                title: true,
                content: true,
                author: {
                    select: {
                        name: true
                    }
                }
            }
        })
    
        return c.json({
            blog
        });
    } catch(e) {
        c.status(411); // 4
        return c.json({
            message: "Error while fetching blog post"
        });
    }
})