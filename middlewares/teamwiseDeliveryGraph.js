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
      /* 1️⃣ ইউজারের আইডি + রোল */
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
  
      /* ------------------------------------------------------------------
         SALES PATH  ➜  একক অবজেক্ট (নিজের টিম)  -------------------------*/
      if (isSales || isSalesLeader) {
        /* subordinate + self */
        let orderByIds = isSalesLeader
          ? (await prisma.team_member.findMany({
              where  : { team_id: me.team_id, role: { startsWith: 'sales_' } },
              select : { id: true },
            })).map(m => m.id).concat(me.id)
          : [me.id];
  
        /* সব অর্ডার (টিম যাই হোক) */
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
  
        /* নিজের টিমের বেসিক ডাটা (target, members, name) */
        const teamData = await prisma.team.findUnique({
          where  : { id: me.team_id },
          select : {
            team_target : true,
            team_name   : true,
            team_member : { select : { id: true, first_name: true, target: true } },
          },
        });
  
        /* মোট হিসাব */
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
  
        /* memberTarget */
        let memberTarget = [];
  
        if (isSalesLeader) {
          const memberIds = teamData.team_member.map(m => m.id);
          const distributions = await prisma.member_distribution.findMany({
            where: { team_member_id: { in: memberIds } },
          });
  
          memberTarget = teamData.team_member.map(m => ({
            memberName: m.first_name,
            target    : m.target || 0,
            earned    : distributions
                         .filter(d => d.team_member_id === m.id)
                         .reduce((s, d) => s + Number(d.amount), 0),
          }));
        } else { // individual sales_*
          const myTarget = teamData.team_member.find(m => m.id === me.id)?.target || 0;
          const { _sum } = await prisma.member_distribution.aggregate({
            where : { team_member_id: me.id },
            _sum  : { amount: true },
          });
          memberTarget = [{
            memberName: me.first_name || 'You',
            target    : myTarget,
            earned    : Number(_sum.amount || 0),
          }];
        }
  
        /* চার-সপ্তাহ ব্রেকডাউন */
        const weeks = [
          { week:'Week 1', start:new Date(today.getFullYear(),today.getMonth(),1 ), end:new Date(today.getFullYear(),today.getMonth(),7 ) },
          { week:'Week 2', start:new Date(today.getFullYear(),today.getMonth(),8 ), end:new Date(today.getFullYear(),today.getMonth(),14) },
          { week:'Week 3', start:new Date(today.getFullYear(),today.getMonth(),15), end:new Date(today.getFullYear(),today.getMonth(),21) },
          { week:'Week 4', start:new Date(today.getFullYear(),today.getMonth(),22), end:endOfMonth },
        ];
        const weeklyAchievementBreakdown = weeks.map(({week,start,end}) => ({
          week,
          range : `${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,
          target: Math.round(teamTarget/4),
          amount: projectsThisMonth
                   .filter(p=>p.is_delivered && new Date(p.delivery_date)>=start && new Date(p.delivery_date)<=end)
                   .reduce((s,p)=>s+Number(p.after_fiverr_amount||0)+Number(p.after_Fiverr_bonus||0),0),
        }));
  
        /* একটাই রেজাল্ট অবজেক্ট Emit */
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
        return;                       // ✔️ sales path শেষ
      }
  
      /* ------------------------------------------------------------------
         OPERATION PATH  ➜  টিম-ওয়াইজ (পুরনো লজিক) ---------------------*/
      if (!isOperation) return console.log('Invalid role');
  
      /* টিম-আইডি = আমার নিজস্ব টিম */
      const teamIds = [me.team_id].filter(Boolean);
  
      const resultArray = [];
  
      for (const teamId of teamIds) {
        const teamData = await prisma.team.findUnique({
          where  : { id: teamId },
          select : {
            team_target : true,
            team_name   : true,
            team_member : { select : { id: true, first_name: true, target: true } },
          },
        });
        if (!teamData) continue;
  
        const baseFilter  = { team_id: teamId };
        const thisMonth   = await prisma.project.findMany({
          where : {
            ...baseFilter,
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
  
        const memberIds = teamData.team_member.map(m=>m.id);
        const distributions = await prisma.member_distribution.findMany({
          where:{ team_member_id:{in:memberIds} },
        });
        const memberTarget = teamData.team_member.map(m=>({
          memberName:m.first_name,
          target:m.target||0,
          earned:distributions.filter(d=>d.team_member_id===m.id)
                 .reduce((s,d)=>s+Number(d.amount),0),
        }));
  
        const weeks=[
          {week:'Week 1',start:new Date(today.getFullYear(),today.getMonth(),1),end:new Date(today.getFullYear(),today.getMonth(),7)},
          {week:'Week 2',start:new Date(today.getFullYear(),today.getMonth(),8),end:new Date(today.getFullYear(),today.getMonth(),14)},
          {week:'Week 3',start:new Date(today.getFullYear(),today.getMonth(),15),end:new Date(today.getFullYear(),today.getMonth(),21)},
          {week:'Week 4',start:new Date(today.getFullYear(),today.getMonth(),22),end:endOfMonth},
        ];
        const weeklyAchievementBreakdown = weeks.map(({week,start,end})=>({
          week,
          range:`${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,
          target:Math.round(teamTarget/4),
          amount:thisMonth.filter(p=>p.is_delivered&&new Date(p.delivery_date)>=start&&new Date(p.delivery_date)<=end)
                 .reduce((s,p)=>s+Number(p.after_fiverr_amount||0)+Number(p.after_Fiverr_bonus||0),0),
        }));
  
        resultArray.push({
          teamTarget,
          teamAchievement,
          teamCancelled,
          teamTotalCarry,
          submitted,
          totalAssign,
          teamName  : teamData.team_name,
          memberTarget,
          weeklyAchievementBreakdown,
        });
      }
  
      /* Emit operation result(s) */
      io.emit('eachTeamChart', resultArray);
  
    } catch (err) {
      console.error('Error fetching team data:', err);
    }
  }
  
  

  //have to do team id pass 
  

module.exports = { teamwiseDeliveryGraph, eachTeamChart };