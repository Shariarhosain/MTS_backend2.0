const { PrismaClient } = require('@prisma/client');
const { io } = require('socket.io-client');
const prisma = new PrismaClient();


async function teamwiseDeliveryGraph(io) {
    //show team wise total  delivery amout( after fiverr amount) group by team name
    try {
        const projects = await prisma.project.findMany({
            where: {
                is_delivered: true,
            },
            include: {
                team: true,
            },
        });

        const teamWiseDelivery = projects.reduce((acc, project) => {
            const teamName = project.team ? project.team.team_name : 'Unknown Team';
            const amount = parseInt(project.after_fiverr_amount) + (parseInt(project.after_Fiverr_bonus) || 0) || 0;

            if (!acc[teamName]) {
                acc[teamName] = 0;
            }
            acc[teamName] += amount;
            return acc;
        }, {});

        io.emit("teamwiseDeliveryGraph", teamWiseDelivery); // Emit the data to the socket
        res.status(200).json(teamWiseDelivery);
    } catch (error) {
        console.error('Error fetching team-wise delivery:', error);
        res.status(500).json({ error: 'Internal server error' });
    }



}

async function eachTeamChart(io) {
    try {
      /* 1️⃣ User info */
      const me = await prisma.team_member.findUnique({
        where  : { uid: global.user.uid },
        select : { id: true, role: true, first_name: true, team_id: true },
      });
      if (!me) return console.log('User not found');
  
      const isSalesLeader = me.role === 'sales_leader';
      const isSales       = me.role?.startsWith('sales_') && !isSalesLeader;
      const isOperation   = me.role?.startsWith('operation_');
  
      const today        = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
      /* SALES / SALES_LEADER  → single combined object */
      if (isSales || isSalesLeader) {
  
        /* ➊ কোন কোন member-id ধরব */
        let orderByIds = isSalesLeader
          ? (await prisma.team_member.findMany({
              where  : { team_id: me.team_id, role: { startsWith: 'sales_' } },
              select : { id: true },
            })).map(m => m.id).concat(me.id)   // leader নিজেও
          : [me.id];
  
        /* ➋ সেই সব অর্ডারের প্রজেক্ট (এই মাসে যাই হোক) */
        const projectsThisMonth = await prisma.project.findMany({
          where: {
            ordered_by: { in: orderByIds },
            OR: [
              { is_delivered: true },
              { AND: [
                  { is_delivered: false },
                  { delivery_date: { gte: startOfMonth } },
                ]},
            ],
          },
        });
        const projectsNotDelivered = await prisma.project.findMany({
          where: { ordered_by: { in: orderByIds }, is_delivered: false },
        });
        const projectsAll = [...projectsThisMonth, ...projectsNotDelivered];
  
        /* ➌ নিজের টিমের বেসিক তথ্য */
        const teamData = await prisma.team.findUnique({
          where  : { id: me.team_id },
          select : {
            team_target : true,
            team_name   : true,
            team_member : { select : { id: true, first_name: true, target: true } },
          },
        });
  
        /* ➍ মোট মেট্রিক */
        let teamTarget      = Number(teamData.team_target || 0);
        let teamAchievement = 0, teamCancelled = 0,
            teamTotalCarry  = 0, submitted     = 0, totalAssign = 0;
  
        projectsThisMonth.forEach(p => {
          if (p.is_delivered) {
            teamAchievement += Number(p.after_fiverr_amount || 0) +
                               Number(p.after_Fiverr_bonus  || 0);
          }
        });
        projectsNotDelivered.forEach(p => {
          teamTotalCarry += Number(p.total_carry || 0);
  
          if (p.status === 'submitted') {
            submitted += Number(p.after_fiverr_amount || 0) +
                         Number(p.after_Fiverr_bonus  || 0);
          }
          if (p.status === 'cancelled') {
            teamCancelled += Number(p.after_fiverr_amount || 0) +
                             Number(p.after_Fiverr_bonus  || 0);
          }
          totalAssign += Number(p.after_fiverr_amount || 0) +
                         Number(p.after_Fiverr_bonus  || 0);
        });
  
        /* ➎ earned map তৈরি (ordered_by ভিত্তিতে) */
        const earnedMap = new Map();
        projectsAll.forEach(p => {
          const amt = Number(p.after_fiverr_amount || 0) +
                      Number(p.after_Fiverr_bonus  || 0);
          earnedMap.set(p.ordered_by,
            (earnedMap.get(p.ordered_by) || 0) + amt);
        });
  
        /* ➏ memberTarget */
        let memberTarget;
        if (isSalesLeader) {
          memberTarget = teamData.team_member.map(m => ({
            memberName : m.first_name,
            target     : m.target || 0,
            earned     : earnedMap.get(m.id) || 0,
          }));
        } else { // individual sales_*
          const myTarget = teamData.team_member.find(m => m.id === me.id)?.target || 0;
          memberTarget = [{
            memberName : me.first_name || 'You',
            target     : myTarget,
            earned     : earnedMap.get(me.id) || 0,
          }];
        }
  
        /* ➐ সাপ্তাহিক ব্রেকডাউন */
        const weeks = [
          { w:'Week 1', s:new Date(today.getFullYear(),today.getMonth(), 1 ), e:new Date(today.getFullYear(),today.getMonth(), 7 ) },
          { w:'Week 2', s:new Date(today.getFullYear(),today.getMonth(), 8 ), e:new Date(today.getFullYear(),today.getMonth(),14 ) },
          { w:'Week 3', s:new Date(today.getFullYear(),today.getMonth(),15 ), e:new Date(today.getFullYear(),today.getMonth(),21 ) },
          { w:'Week 4', s:new Date(today.getFullYear(),today.getMonth(),22 ), e:endOfMonth },
        ];
        const weeklyAchievementBreakdown = weeks.map(({w,s,e}) => ({
          week  : w,
          range : `${s.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${e.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,
          target: Math.round(teamTarget / 4),
          amount: projectsThisMonth
                   .filter(p => p.is_delivered && new Date(p.delivery_date)>=s && new Date(p.delivery_date)<=e)
                   .reduce((sum,p) => sum + Number(p.after_fiverr_amount||0) + Number(p.after_Fiverr_bonus||0), 0),
        }));
  
        /* ➑ Emit single object */
        io.emit('eachTeamChart', [{
          teamTarget,
          teamAchievement,
          teamCancelled,
          teamTotalCarry,
          submitted,
          totalAssign,
          teamName  : teamData.team_name,
          memberTarget,
          weeklyAchievementBreakdown,
        }]);
        return;
      }
  
      /* ----------------------------------------------------------------
         OPERATION PATH  (unchanged except earnedMap)                   */
      if (!isOperation) return console.log('Invalid role');
  
      const teamData = await prisma.team.findUnique({
        where  : { id: me.team_id },
        select : {
          team_target : true,
          team_name   : true,
          team_member : { select : { id: true, first_name: true, target: true } },
        },
      });
  
      const baseFilter = { team_id: me.team_id };
      const thisMonth  = await prisma.project.findMany({
        where : {
          ...baseFilter,
          OR: [
            { is_delivered: true },
            { AND: [ { is_delivered: false },
                     { delivery_date: { gte: startOfMonth } } ] },
          ],
        },
      });
      const notDelivered = await prisma.project.findMany({
        where: { ...baseFilter, is_delivered: false },
      });
  
      let teamTarget      = Number(teamData.team_target || 0);
      let teamAchievement = 0, teamCancelled = 0,
          teamTotalCarry  = 0, submitted     = 0, totalAssign = 0;
  
      thisMonth.forEach(p=>{
        if(p.is_delivered){
          teamAchievement += Number(p.after_fiverr_amount||0)+Number(p.after_Fiverr_bonus||0);
        }
      });
      notDelivered.forEach(p=>{
        teamTotalCarry += Number(p.total_carry||0);
        if(p.status==='submitted'){
          submitted += Number(p.after_fiverr_amount||0)+Number(p.after_Fiverr_bonus||0);
        }
        if(p.status==='cancelled'){
          teamCancelled += Number(p.after_fiverr_amount||0)+Number(p.after_Fiverr_bonus||0);
        }
        totalAssign += Number(p.after_fiverr_amount||0)+Number(p.after_Fiverr_bonus||0);
      });
  
      const projectsAll = [...thisMonth, ...notDelivered];
      const earnedMap = new Map();


// helper → Decimal | string | null ➜ numeric
const num = v => v ? parseFloat(v.toString()) : 0;

// buildEarnedMap → exclude cancelled entirely
const buildEarnedMap = projects => {
  const map = new Map();
  projects
    .filter(p => p.status !== 'cancelled')    // ← skip all cancelled
    .forEach(p => {
      const amt = num(p.after_fiverr_amount) + num(p.after_Fiverr_bonus);
      map.set(
        p.ordered_by,
        (map.get(p.ordered_by) || 0) + amt
      );
    });
  return map;
};

// …then in your code:


// earnedMap – শুধু delivered বা submitted ধরে
console.log('projectsAll', projectsAll);
projectsAll
.filter(p => p.status !== 'cancelled')   // ← চাইলে submitted যোগ করুন
  .forEach(p => {
    const amt = num(p.after_fiverr_amount) + num(p.after_Fiverr_bonus);

    earnedMap.set(p.ordered_by, (earnedMap.get(p.ordered_by) || 0) + amt);
 
  });
      const memberTarget = teamData.team_member.map(m=>({
        memberName : m.first_name,
        target     : m.target || 0,
        earned     : earnedMap.get(m.id) || 0,
      }));
  
      const weeks = [
        { w:'Week 1', s:new Date(today.getFullYear(),today.getMonth(),1), e:new Date(today.getFullYear(),today.getMonth(),7) },
        { w:'Week 2', s:new Date(today.getFullYear(),today.getMonth(),8), e:new Date(today.getFullYear(),today.getMonth(),14) },
        { w:'Week 3', s:new Date(today.getFullYear(),today.getMonth(),15),e:new Date(today.getFullYear(),today.getMonth(),21) },
        { w:'Week 4', s:new Date(today.getFullYear(),today.getMonth(),22),e:endOfMonth },
      ];
      const weeklyAchievementBreakdown = weeks.map(({w,s,e})=>({
        week  : w,
        range : `${s.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${e.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,
        target: Math.round(teamTarget/4),
        amount: thisMonth.filter(p=>p.is_delivered && new Date(p.delivery_date)>=s && new Date(p.delivery_date)<=e)
               .reduce((sum,p)=>sum+Number(p.after_fiverr_amount||0)+Number(p.after_Fiverr_bonus||0),0),
      }));
  
      io.emit('eachTeamChart',[{
        teamTarget,
        teamAchievement,
        teamCancelled,
        teamTotalCarry,
        submitted,
        totalAssign,
        teamName  : teamData.team_name,
        memberTarget,
        weeklyAchievementBreakdown,
      }]);
  
    } catch (err) {
      console.error('Error fetching team data:', err);
    }
  }
  
async function eachTeamChartByid(io, team_id) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
      const teamData = await prisma.team.findUnique({
        where: { id: team_id },
        select: {
          team_target: true,
          team_name: true,
          team_member: {
            select: { id: true, first_name: true, target: true, role: true },
          },
        },
      });
  
      if (!teamData) return console.log("Team not found");
  
      const orderByIds = teamData.team_member
        .filter((m) => m.role?.startsWith("sales_"))
        .map((m) => m.id);
  
      const projectsThisMonth = await prisma.project.findMany({
        where: {
          ordered_by: { in: orderByIds },
          OR: [
            { is_delivered: true },
            {
              AND: [
                { is_delivered: false },
                { delivery_date: { gte: startOfMonth } },
              ],
            },
          ],
        },
      });
  
      const projectsNotDelivered = await prisma.project.findMany({
        where: {
          ordered_by: { in: orderByIds },
          is_delivered: false,
        },
      });
  
      const projectsAll = [...projectsThisMonth, ...projectsNotDelivered];
  
      let teamTarget = Number(teamData.team_target || 0);
      let teamAchievement = 0,
        teamCancelled = 0,
        teamTotalCarry = 0,
        submitted = 0,
        totalAssign = 0;
  
      projectsThisMonth.forEach((p) => {
        if (p.is_delivered) {
          teamAchievement +=
            Number(p.after_fiverr_amount || 0) +
            Number(p.after_Fiverr_bonus || 0);
        }
      });
  
      projectsNotDelivered.forEach((p) => {
        teamTotalCarry += Number(p.total_carry || 0);
        if (p.status === "submitted") {
          submitted +=
            Number(p.after_fiverr_amount || 0) +
            Number(p.after_Fiverr_bonus || 0);
        }
        if (p.status === "cancelled") {
          teamCancelled +=
            Number(p.after_fiverr_amount || 0) +
            Number(p.after_Fiverr_bonus || 0);
        }
        totalAssign +=
          Number(p.after_fiverr_amount || 0) +
          Number(p.after_Fiverr_bonus || 0);
      });
  
      const earnedMap = new Map();
      projectsAll
        .filter((p) => p.status !== "cancelled")
        .forEach((p) => {
          const amt =
            Number(p.after_fiverr_amount || 0) +
            Number(p.after_Fiverr_bonus || 0);
          earnedMap.set(
            p.ordered_by,
            (earnedMap.get(p.ordered_by) || 0) + amt
          );
        });
  
      const memberTarget = teamData.team_member.map((m) => ({
        memberName: m.first_name,
        target: m.target || 0,
        earned: earnedMap.get(m.id) || 0,
      }));
  
      const weeks = [
        {
          w: "Week 1",
          s: new Date(today.getFullYear(), today.getMonth(), 1),
          e: new Date(today.getFullYear(), today.getMonth(), 7),
        },
        {
          w: "Week 2",
          s: new Date(today.getFullYear(), today.getMonth(), 8),
          e: new Date(today.getFullYear(), today.getMonth(), 14),
        },
        {
          w: "Week 3",
          s: new Date(today.getFullYear(), today.getMonth(), 15),
          e: new Date(today.getFullYear(), today.getMonth(), 21),
        },
        {
          w: "Week 4",
          s: new Date(today.getFullYear(), today.getMonth(), 22),
          e: endOfMonth,
        },
      ];
  
      const weeklyAchievementBreakdown = weeks.map(({ w, s, e }) => ({
        week: w,
        range: `${s.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${e.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
        target: Math.round(teamTarget / 4),
        amount: projectsThisMonth
          .filter(
            (p) =>
              p.is_delivered &&
              new Date(p.delivery_date) >= s &&
              new Date(p.delivery_date) <= e
          )
          .reduce(
            (sum, p) =>
              sum +
              Number(p.after_fiverr_amount || 0) +
              Number(p.after_Fiverr_bonus || 0),
            0
          ),
      }));
  
      io.emit("eachTeamChartBYteam_id", [
        {
          teamTarget,
          teamAchievement,
          teamCancelled,
          teamTotalCarry,
          submitted,
          totalAssign,
          teamName: teamData.team_name,
          memberTarget,
          weeklyAchievementBreakdown,
        },
      ]);
    } catch (err) {
      console.error("Error fetching team data:", err);
    }
  }
module.exports = { teamwiseDeliveryGraph, eachTeamChart, eachTeamChartByid };