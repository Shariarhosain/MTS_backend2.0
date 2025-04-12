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

  // Create 50 team members and link to teams
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
        team_id: teams[i % teams.length].id, // Assign to a team
        religion: 'Religion',
        education: 'Bachelors',
        dp: `dp${i}.jpg`,
        designation: 'Developer',
        role: 'Junior Developer',
        target: Math.random() * 5000,
        rewards: Math.random() * 2000,
        rating: Math.floor(Math.random() * 5),
        account_status : 'Active',
      },
    });
    teamMembers.push(teamMember);
  }

  // Create 50 profiles and link to team members and departments
  const profiles = [];
  for (let i = 1; i <= 50; i++) {
    const profile = await prisma.profile.create({
      data: {
        created_date: new Date(),
        profile_name: `Profile ${i}`,
        profile_person_name_id: teamMembers[i - 1].id,
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

  // Create 50 projects and link to departments, team members
  const projects = [];
  for (let i = 1; i <= 50; i++) {
    const project = await prisma.project.create({
      data: {
        order_id: `Order${i}`,
        date: new Date(),
        project_name: `Project ${i}`,
        ops_status: 'Pending',
        sales_comments: `Sales Comment ${i}`,
        opsleader_comments: `Ops Leader Comment ${i}`,
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
      },
    });
    projects.push(project);
  }

  // Create 50 task assignments and link to departments, teams, and projects
  for (let i = 1; i <= 50; i++) {
    await prisma.task_assign_team.create({
      data: {
        task_assign_id: i,
        department_id: departments[i % departments.length].id,
        team_id: teams[i % teams.length].id,
        project_id: projects[i % projects.length].id,
      },
    });
  }

  console.log('Seed data inserted successfully!');
};

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
