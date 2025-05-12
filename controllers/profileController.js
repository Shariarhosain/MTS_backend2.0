const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Socket } = require('socket.io-client');

// Create an instance of express app
const app = express();
const server = http.createServer(app); // assuming you are using express
const io = socketIo(server);  // Create a new instance of Socket.IO


exports.selesView_recent_month = async (req, res) => {
    try {
        const currentDate = new Date();
        console.log('Current Date:', currentDate);
        
        // Current month (April)
        const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endOfCurrentMonth.setHours(23, 59, 59, 999);
     
        const startDate = startOfCurrentMonth;
        const endDate = endOfCurrentMonth;

        const salesData = await prisma.project.groupBy({
            by: ['profile_id'],
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            _sum: {
                after_fiverr_amount: true,
                after_Fiverr_bonus: true
            }
        });


        console.log('Sales Data:', salesData);
       
        

        const salesDataWithProfileName = await Promise.all(salesData.map(async (data) => {
            if (data.profile_id) {  // Only proceed if profile_id is not null
                const profile = await prisma.profile.findUnique({
                    where: { id: data.profile_id },  // Query only if profile_id is valid
                    select: { profile_name: true }
                });
                return {
                    profile_name: profile?.profile_name || 'Unknown',
                    total_sales: Number(data._sum.after_fiverr_amount || 0) + Number(data._sum.after_Fiverr_bonus || 0),
                };
                
            } else {
                // If profile_id is null, return a default profile_name
                return {
                    profile_name: 'Unknown',  // Fallback value when no profile_id is provided
                    total_sales: data._sum.after_fiverr_amount + data._sum.after_Fiverr_bonus
                };
            }
        }));
        
        console.log(salesDataWithProfileName);
        // Emit the sales data to all connected clients
        return res.status(200).json({
            message: 'Sales data retrieved successfully',
            salesData: salesDataWithProfileName
        });
    } catch (error) {
        console.error('Error retrieving sales data:', error);
        return res.status(500).json({ message: 'An error occurred while retrieving sales data', error: error.message });
    }
};




exports.announcement = async (req, res) => {
  try {
    // 1️⃣ Fetch announcements where is_done is false
    const announcements = await prisma.anouncement.findMany({
      where: { is_done: false },
    });

    // 2️⃣ If none found, respond once
    if (announcements.length === 0) {
      return res.status(200).json({
        announcements: true,
      });
    }
    // 3️⃣ If found, respond with the announcements
    return res.status(200).json({
      announcements: false,
    });

  } catch (error) {
    console.error('Error retrieving announcements:', error);
    return res.status(500).json({
      message: 'An error occurred while retrieving announcements',
      error: error.message,
    });
  }
};

exports.announcementPost = async (req, res) => {
  try {
    const { done } = req.body;

    if (!done) {
      return res.status(400).json({
        message: 'Invalid request: done is required',
      });
    }
      // 3️⃣ Update all fetched announcements to is_done = true
    await prisma.anouncement.update({
      where: { id: 1 },
      data: { is_done: true },
    });

    // 4️⃣ Return the announcements
    return res.status(200).json({
      message: 'Announcements retrieved successfully',
      announcements: "done",
    });
  } catch (error) {
    console.error('Error updating announcements:', error);
    return res.status(500).json({
      message: 'An error occurred while updating announcements',
      error: error.message,
    });
  }
};




//////////////////////////////////////////////// Profile Ranking


exports.profileRanking = async (req, res) => {
try{
  

  //post type profile name, ranking page , row , keywords
  const { profileName, rankingPage, row, keywords } = req.body;

  if (!profileName || !rankingPage || !row || !keywords) {
    return res.status(400).json({
      message: 'Invalid request: profileName, rankingPage, row, and keywords are required',
    });
  }

  /*model profile_ranking {
  id             Int          @id @default(autoincrement())
  profile_id     Int
  profile        profile      @relation(fields: [profile_id], references: [id])
  keywords       String?
  row          Int?
  ranking_page  String?
  created_date   DateTime?
  update_at      DateTime?
}

 */
const profile = await prisma.profile.findUnique({
    where: { profile_name: profileName },
  });
  if (!profile) {
    return res.status(404).json({
      message: 'Profile not found',
    });
  }
  const profileId = profile.id;
  // Check if the profile already has a ranking entry

  const profileRanking = await prisma.profile_ranking.create({
    data: {
      profile_id: {
        connect: { id: profileId },
      },
      keywords: keywords,
      row: row,
      ranking_page: rankingPage,
      created_date: new Date(),
      update_at: new Date(),
    },
  });

  return res.status(200).json({
    message: 'Profile updated successfully',
    profile: profileRanking,
  });
} catch (error) {
  console.error('Error updating profile:', error);
  return res.status(500).json({
    message: 'An error occurred while updating the profile',
    error: error.message,
  });

};
}


exports.AllprofileRankingGet = async (req, res) => {
  try {
    // getall profile ranking data select all
    const profiles = await prisma.profile_ranking.findMany({
      include: {
        profile: {
          select: {
            profile_name: true,
          },
        },
      },
      orderBy: {
        created_date: 'desc',
      },
    });
    if (!profiles || profiles.length === 0) {
      return res.status(404).json({
        message: 'No profiles found',
      });
    }

    return res.status(200).json({
      message: 'All profiles retrieved successfully',
      profiles,
    });
  } catch (error) {
    console.error('Error retrieving profile ranking:', error);
    return res.status(500).json({
      message: 'An error occurred while retrieving profile ranking',
      error: error.message,
    });
  }

    
};


exports.updateprofile_ranking = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the profile ID is provided
    if (!id) {
      return res.status(400).json({
        message: 'Invalid request: id is required',
      });
    }

    const updatedProfileRanking = await prisma.profile_ranking.update({
      where: { id: Number(id) },
      data: {
       ...req.body,
        update_at: new Date(),
      }, 
    });

    return res.status(200).json({
      message: 'Profile ranking updated successfully',
      profileRanking: updatedProfileRanking,
    });
  } catch (error) {
    console.error('Error updating profile ranking:', error);
    return res.status(500).json({
      message: 'An error occurred while updating the profile ranking',
      error: error.message,
    });
  }
};

exports.deleteProfileRanking = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the profile ID is provided
    if (!id) {
      return res.status(400).json({
        message: 'Invalid request: id is required',
      });
    }
    // Delete the profile ranking
    const deletedProfileRanking = await prisma.profile_ranking.delete({
      where: { id: Number(id) },
    });
    return res.status(200).json({
      message: 'Profile ranking deleted successfully',
      profileRanking: deletedProfileRanking,
    });
  } catch (error) {
    console.error('Error deleting profile ranking:', error);
    return res.status(500).json({
      message: 'An error occurred while deleting the profile ranking',
      error: error.message,
    });
  }
};











exports.promotionprofile = async (req, res) => {
  try {
    const { profileName, promotionAmount } = req.body;

    if (!profileName || !promotionAmount) {
      return res.status(400).json({
        message: 'Invalid request: profileName and promotionAmount are required',
      });
    }
    // Find the profile by name
    const profile = await prisma.profile.findUnique({
      where: { profile_name: profileName },
    });

    if (!profile) {
      return res.status(404).json({
        message: 'Profile not found',
      });
    }

    const profileId = profile.id;

    // crete a new profile_promotion
    const profilePromotion = await prisma.profile_promotion.create({
      data: {
        profile_id: {
          connect: { id: profileId },
        },
        promotion_amount: promotionAmount,
        created_date: new Date(),
        update_at: new Date(),
      },
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      message: 'An error occurred while updating the profile',
      error: error.message,
    });
  }
};


exports.AllprofilePromotionGet = async (req, res) => {
  try {
    // getall profile ranking data select all
    const profiles = await prisma.profile_promotion.findMany({
      include: {
        profile: {
          select: {
            profile_name: true,
          },
        },
      },
      orderBy: {
        created_date: 'desc',
      },
    });
    if (!profiles || profiles.length === 0) {
      return res.status(404).json({
        message: 'No profiles found',
      });
    }

    return res.status(200).json({
      message: 'All profiles retrieved successfully',
      profiles,
    });
  } catch (error) {
    console.error('Error retrieving profile ranking:', error);
    return res.status(500).json({
      message: 'An error occurred while retrieving profile ranking',
      error: error.message,
    });
  }
};



exports.updateprofile_promotion = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the profile ID is provided
    if (!id) {
      return res.status(400).json({
        message: 'Invalid request: id is required',
      });
    }

    const updatedProfilePromotion = await prisma.profile_promotion.update({
      where: { id: Number(id) },
      data: {
       ...req.body,
        update_at: new Date(),
      }, 
    });

    return res.status(200).json({
      message: 'Profile promotion updated successfully',
      profilePromotion: updatedProfilePromotion,
    });
  } catch (error) {
    console.error('Error updating profile promotion:', error);
    return res.status(500).json({
      message: 'An error occurred while updating the profile promotion',
      error: error.message,
    });
  }
};


exports.deleteProfilePromotion = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the profile ID is provided
    if (!id) {
      return res.status(400).json({
        message: 'Invalid request: id is required',
      });
    }
    // Delete the profile ranking
    const deletedProfilePromotion = await prisma.profile_promotion.delete({
      where: { id: Number(id) },
    });
    return res.status(200).json({
      message: 'Profile promotion deleted successfully',
      profilePromotion: deletedProfilePromotion,
    });
  } catch (error) {
    console.error('Error deleting profile promotion:', error);
    return res.status(500).json({
      message: 'An error occurred while deleting the profile promotion',
      error: error.message,
    });
  }
};


