const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


/*
model project {
  id                 Int       @id @default(autoincrement())
  order_id           String?    
  date               DateTime? 
  project_name       String?   @db.VarChar(200) @unique
  ops_status         String?
  sales_comments     String?
  opsleader_comments String?
  sheet_link         String?
  team_member        team_member? @relation(fields: [ordered_by], references: [id]) 
  ordered_by         Int
  deli_last_date     DateTime?
  status             String?
  order_amount       Decimal?  @db.Decimal(65,0)  
  after_fiverr_amount Decimal?   
  bonus              Decimal?  @db.Decimal(65,0)    
  after_Fiverr_bonus Decimal? @db.Decimal(65,0) 
  rating             Int?
 department         department? @relation(fields: [department_id], references: [id], onDelete: Cascade) // One project belongs to one department
  department_id      Int      
  project_requirements String? @db.Text
 // Relation with task assignments
  task_assign_team   task_assign_team[] // one team can have many task assignments


}*/


//curd operations for project table
    exports.createProject = async (req, res) => { 
        try {
           
            // Destructure the variables from the request body
            const { clientName, ops_status, sales_comments, opsleader_comments, sheet_link, ordered_by, deli_last_date, status, orderAmount, bonus, rating, department, project_requirements} = req.body;
    
            // Create orderId by using the current date and time 
       const order_id= new Date().getTime().toString();

            
            // Create the project name by combining clientName and orderId
            const projectName = `${clientName}-${order_id}`;
    
            // Check all data is present in the request body
            if (!clientName || !ops_status || !sales_comments || !opsleader_comments || !sheet_link || !ordered_by || !deli_last_date || !status || !orderAmount || !bonus || !rating || !department) {
                return res.status(400).json({ error: 'All fields are required.' });
            }
            

            //projectName and orderId are not allowed in the request body
            if (req.body.projectName || req.body.orderId) { 
                return res.status(400).json({ error: 'projectName and orderId are not allowed in the request body.' });
            }



    
            // Get departmentId from department name
            const departmentData = await prisma.department.findUnique({
                where: { department_name: department }
            });
    
            const departmentId = departmentData ? departmentData.id : null;
    
            if (!departmentId) {
                return res.status(400).json({ error: 'Invalid department name.' });
            }
            // after_fiverr_amount and after_fiverr_bonus calculted by using order_amount and bonus  20% of order_amount and bonus
            const order_amount = orderAmount ? parseFloat(orderAmount) : null;
            const after_fiverr_amount = order_amount ? order_amount * 0.8 : null;

            const after_Fiverr_bonus = bonus ? parseFloat(bonus) * 0.8 : null;

    
            // Create the project record in the database
            const project = await prisma.project.create({
                data: {
                    order_id,
                    date: new Date(),
                    project_name: projectName,
                    ops_status,
                    sales_comments,
                    opsleader_comments,
                    sheet_link,
                    team_member: {
                        connect: { id: ordered_by }  // Assuming the team member with ID 6 exists
                      },
                    deli_last_date,
                    status,
                    order_amount,
                    after_fiverr_amount,
                    bonus,
                    after_Fiverr_bonus,
                    rating,
                    department: {
                        connect: { id: departmentId }
                    },
                    project_requirements
                }
            });
    
            res.status(201).json({ message: "Project created successfully.", project });
        } catch (error) {
            res.status(500).json({ error: 'An error occurred while creating the project.' });
    
        }
    }
    



// Get all projects with pagination post method

exports.getAllProjects = async (req, res) => {

    try {
        const { page = 1, limit = 10 } = req.body;

        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;
    
        const projects = await prisma.project.findMany({
            skip,
            take: limitNumber,
            include: {
                department: true,
            }
        });

        const totalProjects = await prisma.project.count();

        return res.status(200).json({
            message: 'All projects retrieved successfully',
            projects,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: totalProjects,
                totalPages: Math.ceil(totalProjects / limitNumber),
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching projects.' });
        console.error('Error fetching projects:', error);
    }
}



exports.updateProject = async (req, res) => {
    const { id } = req.params;
    try {

        //find by id if not found return
        const ID = await prisma.project.findUnique({
            where: { id: Number(id) }
        });
        if (!ID) {
            return res.status(404).json({ error: 'Project not found.' });
        }



        
        //if request body has projectName then send not possible to update
        if (req.body.projectName) {
            return res.status(400).json({ error: 'Updating projectName is not possible.' });
        }
        //find departman name and get departmentId
       if(req.body.department){
        const departmentName = req.body.department;
        const departmentData = await prisma.department.findUnique({
            where: { department_name: departmentName }
        });
        const departmentId = departmentData ? departmentData.id : null;
        if (!departmentId) {
            return res.status(400).json({ error: 'Invalid department name.' });
        }
        //update project by id and send response also if send department id
        const project = await prisma.project.update({
            where: { id: Number(id) },
            data: {
                ...req.body,
                departmentId: departmentId
            }
        });
        res.status(200).json({ message: "Project updated successfully.", project });

       }
       const project = await prisma.project.update({
        where: { id: Number(id) },
        data: {
            ...req.body,
          
        }
    });
    res.status(200).json({ message: "Project updated successfully.", project });


     
        
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the project.' });
        console.error('Error updating project:', error);
    }
}


