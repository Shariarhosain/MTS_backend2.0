const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/*
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "projectName" TEXT NOT NULL,
    "opsStatus" TEXT NOT NULL,
    "salesComments" TEXT,
    "opsleaderComments" TEXT,
    "sheetLink" TEXT,
    "orderedBy" INTEGER NOT NULL,
    "deliLastDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "orderAmount" DECIMAL(65,30) NOT NULL,
    "afterFiverrAmount" DECIMAL(65,30) NOT NULL,
    "bonus" DECIMAL(65,30) NOT NULL,
    "afterFiverrBonus" DECIMAL(65,30) NOT NULL,
    "assignTm" INTEGER NOT NULL,
    "rating" INTEGER,
    "departmentId" INTEGER NOT NULL,
    "projectRequirements" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
*/ 

//curd operations for project table
exports.createProject = async (req, res) => {

    try {
        const { orderId, date, projectName, opsStatus, salesComments, opsleaderComments, sheetLink, orderedBy, deliLastDate, status, orderAmount, afterFiverrAmount, bonus, afterFiverrBonus, assignTm, rating, departmentId } = req.body;
        const project = await prisma.project.create({
            data: {
                orderId,
                date,
                projectName,
                opsStatus,
                salesComments,
                opsleaderComments,
                sheetLink,
                orderedBy,
                deliLastDate,
                status,
                orderAmount,
                afterFiverrAmount,
                bonus,
                afterFiverrBonus,
                assignTm,
                rating,
                departmentId
            }
        });
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while creating the project.' });
    }
}


exports.getAllProjects = async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            include: {
                department: true,
                user: true,
            }
        });
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching projects.' });
    }
}

exports.getProjectById = async (req, res) => {
    const { id } = req.params;
    try {
        const project = await prisma.project.findUnique({
            where: { id: parseInt(id) },
            include: {
                department: true,
                user: true,
            }
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found.' });
        }
        res.status(200).json(project);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the project.' });
    }
}

exports.updateProject = async (req, res) => {
    const { id } = req.params;
    try {
        const project = await prisma.project.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        res.status(200).json(project);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the project.' });
    }
}



exports.deleteProject = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.project.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting the project.' });
    }
}

