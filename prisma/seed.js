const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const seed = async () => {
  // List of departments
  const departmentNames = ['sales', 'plugin', 'mern', 'laravel', 'wordpress'];

  const departments = [];
  for (let i = 0; i < departmentNames.length; i++) {
    // Check if the department already exists
    let department = await prisma.department.findUnique({
      where: { department_name: departmentNames[i] },
    });

    if (!department) {
      // If department doesn't exist, create it
      department = await prisma.department.create({
        data: {
          department_name: departmentNames[i],
          department_target: Math.random() * 10000,
          department_achieve: Math.random() * 10000,
          department_cancel: Math.random() * 1000,
          department_special_order: Math.random() * 5000,
          department_designation: `Designation ${i + 1}`,
          project_requirements: `Requirement for department ${departmentNames[i]}`,
        },
      });
    }

    departments.push(department);
  }

  console.log('Departments created:', departments);


/*

  
  // Create 50 teams and link to departments
  const teams = [];
  for (let i = 1; i <= 50; i++) {
    const team = await prisma.team.create({
      data: {
        team_name: `Team ${i}`,
        department_id: departments[i % departments.length].id, // Assign to a department
        team_achieve: Math.random() * 10000,
        team_cancel: Math.floor(Math.random() * 10),
        total_carry: Math.random() * 1000,
      },
    });
    teams.push(team);
  }

  const teamMembers = [];
  for (let i = 1; i <= 50; i++) {
    const teamMember = await prisma.team_member.create({
      data: {
        first_name: `FirstName ${i}`,
        last_name: `LastName ${i}`,
        email: `email${i}@example.com`,
        number: `12345${i}`,
        permanent_address: `Address ${i}`,
        present_address: `Present Address ${i}`,
        gender: 'Male',
        blood_group: 'O+',
        relationship: 'Single',
        guardian_relation: 'Father',
        guardian_number: '1234567890',
        guardian_address: `Guardian Address ${i}`,
        team: {
          connect: { id: teams[i % teams.length].id },
        },
        religion: 'Religion',
        education: 'Bachelors',
        dp: `dp${i}.jpg`,
        designation: 'Developer',
        role: 'Junior Developer',
        target: Math.random() * 5000,
        rewards: Math.random() * 2000,
        rating: Math.floor(Math.random() * 5),
        account_status: 'Active',
      },
    });
    teamMembers.push(teamMember);
  }

  const profiles = [];
  for (let i = 1; i <= 50; i++) {
    const profile = await prisma.profile.create({
      data: {
        created_date: new Date('2025-04-13T06:51:34.753Z'),
        profile_name: `Profile ${i}`,
        team_members: {
          connect: { id: teamMembers[i - 1].id },
        },
        order_amount: Math.random() * 5000,
        bonus_amount: Math.random() * 2000,
        order_count: Math.floor(Math.random() * 50),
        rank: Math.random() * 100,
        cancel_count: Math.floor(Math.random() * 10),
        complete_count: Math.floor(Math.random() * 40),
        no_rating: Math.floor(Math.random() * 5),
        profile_target: Math.random() * 10000,
        repeat_order: Math.random() * 5000,
        keywords: `Keyword ${i}`,
        total_rating: Math.random() * 100,
        department_id: departments[i % departments.length].id,
      },
    });
    profiles.push(profile);
  }
  console.log('Profiles created:', profiles);
  const currentDateStr = new Date().toLocaleDateString('en-CA'); // "2025-04-13"
  console.log('Current Date:', currentDateStr);

  // Convert string back to Date object
  const current = new Date(currentDateStr);

  // Format function to return YYYY-MM-DD
  const formatDate = (date) => date.toLocaleDateString('en-CA');

  // Current month
  const startOfCurrentMonth = new Date();
  const endOfCurrentMonth = new Date(
    current.getFullYear(),
    current.getMonth() + 1,
    0
  );

  // Previous month
  const startOfLastMonth = new Date(
    current.getFullYear(),
    current.getMonth() - 1,
    1
  );
  const endOfLastMonth = new Date(current.getFullYear(), current.getMonth(), 0);

  // Log all formatted
  console.log('Start of Current Month:', formatDate(startOfCurrentMonth));
  console.log('End of Current Month:', formatDate(endOfCurrentMonth));
  console.log('Start of Last Month:', formatDate(startOfLastMonth));
  console.log('End of Last Month:', formatDate(endOfLastMonth));

  // Create 25 projects for the current month (April)
  const projects = [];
  for (let i = 1; i <= 25; i++) {
    const project = await prisma.project.create({
      data: {
        order_id: `OrderThisMonth${i}`,
        date: startOfCurrentMonth, // Set project date to current month start
        project_name: `Project This Month ${i}`,
        ops_status: 'Pending',
        sales_comments: `Sales Comment for This Month ${i}`,
        opsleader_comments: `Ops Leader Comment for This Month ${i}`,
        sheet_link: `http://link-to-sheet-${i}.com`,
        ordered_by: teamMembers[i % teamMembers.length].id,
        deli_last_date: new Date(),
        status: 'nra',
        order_amount: Math.random() * 10000,
        after_fiverr_amount: Math.random() * 8000,
        bonus: Math.random() * 1000,
        after_Fiverr_bonus: Math.random() * 800,
        rating: Math.floor(Math.random() * 5),
        department_id: departments[i % departments.length].id,
        project_requirements: `Requirements for project ${i}`,
        profile_id: profiles[i % profiles.length].id, // Link to profile
      },
    });
    projects.push(project);
  }

  // Create 25 projects for the previous month (March)
  for (let i = 26; i <= 50; i++) {
    const project = await prisma.project.create({
      data: {
        order_id: `OrderLastMonth${i}`,
        date: startOfLastMonth, // Set project date to previous month start
        project_name: `Project Last Month ${i}`,
        ops_status: 'Pending',
        sales_comments: `Sales Comment for Last Month ${i}`,
        opsleader_comments: `Ops Leader Comment for Last Month ${i}`,
        sheet_link: `http://link-to-sheet-${i}.com`,
        ordered_by: teamMembers[i % teamMembers.length].id,
        deli_last_date: new Date(),
        status: 'Active',
        order_amount: Math.random() * 10000,
        after_fiverr_amount: Math.random() * 8000,
        bonus: Math.random() * 1000,
        after_Fiverr_bonus: Math.random() * 800,
        rating: Math.floor(Math.random() * 5),
        department_id: departments[i % departments.length].id,
        project_requirements: `Requirements for project ${i}`,
        profile_id: profiles[i % profiles.length].id, // Link to profile
      },
    });
    projects.push(project);
  }
// Create 10 revisions (assuming projects and teams already exist)
for (let i = 0; i < 10; i++) {
  const revision = await prisma.revision.create({
    data: {
      project_id: projects[i % projects.length].id,
      revision_date: new Date(),
      revision_comments: `Revision comment ${i + 1}`,
      delivery_date: new Date(new Date().setDate(new Date().getDate() + 7)), // delivery in 7 days
      metting_link: `https://meeting-link-${i + 1}.com`,
      metting_date: new Date(new Date().setDate(new Date().getDate() + 2)), // meeting in 2 days
    },
  });

  // Connect 1-2 teams to this revision
  const numTeams = Math.floor(Math.random() * 2) + 1;
  for (let j = 0; j < numTeams; j++) {
    await prisma.revision_team.create({
      data: {
        revision_id: revision.id,
        team_id: teams[(i + j) % teams.length].id,
      },
    });
  }
}



  console.log('Seed data inserted successfully!'); */




};

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
