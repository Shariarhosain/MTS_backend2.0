const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
exports.createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password,
            },
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error); // Log the error details
        res.status(500).json({ error: "Internal Server Error" });
    }
};
