const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Utility function to generate random strings
function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Utility function to generate a random number within a range
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Utility function to generate random date in the past
function randomDate() {
  const start = new Date(2010, 0, 1);
  const end = new Date();
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  // Generate 50 departments
  for (let i = 0; i < 50; i++) {
    const department = await prisma.department.create({
      data: {
        department_name: `Department ${randomString(5)}`,
        department_target: randomNumber(100000, 500000),
        department_achieve: randomNumber(50000, 200000),
        department_cancel: randomNumber(1000, 50000),
        department_special_order: randomNumber(1000, 10000),
        department_designation: `Designation ${randomString(3)}`,
        project_requirements: `Project Requirements ${randomString(10)}`,
        total_carry: randomNumber(10000, 50000),
        total_assign_project: randomNumber(5, 20),
      }
    });

    // Generate 50 teams for each department
    for (let j = 0; j < 50; j++) {
      const team = await prisma.team.create({
        data: {
          team_name: `Team ${randomString(5)}`,
          department_id: department.id,
          team_achieve: randomNumber(10000, 100000),
          team_cancel: randomNumber(5000, 20000),
          total_carry: randomNumber(5000, 25000),
        }
      });

      // Generate 50 team members for each team
      for (let k = 0; k < 50; k++) {
        const teamMember = await prisma.team_member.create({
          data: {
            first_name: `FirstName ${randomString(5)}`,
            last_name: `LastName ${randomString(5)}`,
            email: `${randomString(5)}@example.com`,
            number: `+1${randomNumber(1000000000, 9999999999)}`,
            permanent_address: `Permanent Address ${randomString(10)}`,
            present_address: `Present Address ${randomString(10)}`,
            gender: randomNumber(0, 1) === 0 ? 'Male' : 'Female',
            blood_group: randomString(2).toUpperCase(),
            relationship: randomNumber(0, 1) === 0 ? 'Single' : 'Married',
            guardian_relation: `Guardian ${randomString(3)}`,
            guardian_number: `+1${randomNumber(1000000000, 9999999999)}`,
            guardian_address: `Guardian Address ${randomString(10)}`,
            team_id: team.id,
            department_id: department.id,
            religion: randomString(5),
            education: randomString(10),
            dp: `https://randomuser.me/api/portraits/lego/${randomNumber(1, 10)}.jpg`,
            designation: `Designation ${randomString(3)}`,
            role: randomString(5),
            target: randomNumber(5000, 50000),
            rewards: `Reward ${randomString(5)}`,
            rating: randomNumber(1, 5),
          }
        });

        // Generate ONE profile for each team member (no inner loop for multiple profiles)
        await prisma.profile.create({
          data: {
            created_date: randomDate(),
            profile_name: `Profile ${randomString(3)}`,
            profile_person_name_id: teamMember.id,
            order_amount: randomNumber(1000, 10000),
            bonus_amount: randomNumber(500, 5000),
            order_count: randomNumber(5, 30),
            rank: randomNumber(1, 10),
            cancel_count: randomNumber(0, 5),
            complete_count: randomNumber(5, 20),
            no_rating: randomNumber(0, 10),
            profile_target: randomNumber(5000, 20000),
            department_id: department.id,
            repeat_order: randomNumber(1000, 10000),
            keywords: `Keyword ${randomString(5)}`,
            total_rating: randomNumber(1, 5),
          }
        });
      }

      // Generate 50 projects for each team (now generating only 50 projects per team)
      for (let m = 0; m < 50; m++) {
        await prisma.project.create({
          data: {
            order_id: randomString(8),
            date: randomDate(),
            project_name: `Project ${randomString(5)}`,
            ops_status: randomNumber(0, 1) === 0 ? 'Active' : 'Completed',
            sales_comments: `Sales Comment ${randomString(15)}`,
            opsleader_comments: `Ops Leader Comment ${randomString(15)}`,
            sheet_link: `https://example.com/${randomString(10)}`,
            ordered_by: randomNumber(1, 50), // Ordered by team member
            deli_last_date: randomDate(),
            status: randomNumber(0, 1) === 0 ? 'In Progress' : 'Completed',
            order_amount: randomNumber(1000, 10000),
            after_fiverr_amount: randomNumber(1000, 10000),
            bonus: randomNumber(500, 5000),
            after_Fiverr_bonus: randomNumber(500, 5000),
            assign_tm: team.id,
            rating: randomNumber(1, 5),
            department_id: department.id,
            project_requirements: `Project Requirements ${randomString(10)}`,
          }
        });
      }
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
