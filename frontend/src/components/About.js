import React, { useEffect } from 'react';
import './About.css';
import { motion } from 'framer-motion';

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const teamMembers = [
    {
      id: 1,
      name: 'Ashitosh Phadatare',
      roll: '211AI007',
      photo: '/ashitoshphoto.jpeg'
    },
    {
      id: 2,
      name: 'Darshan RK',
      roll: '211AI015',
      photo: '/darshanphoto.png'
    },
    {
      id: 3,
      name: 'Mauli Mehulkumar Patel',
      roll: '211AI024',
      photo: '/cartoon-avatar.png'
    },
    {
      id: 4,
      name: 'Varun Arya',
      roll: '211AI038',
      photo: '/varunphoto.png'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  return (
    <div className="about-container">
      {/* Background decorations */}
      <div className="bg-decoration bg-decoration-1"></div>
      <div className="bg-decoration bg-decoration-2"></div>
      
      <motion.div 
        className="about-header"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>Meet the Developer Team</h1>
        <p className="project-subtitle">SSD Project - Mangalore Smart City</p>
      </motion.div>

      <motion.div 
        className="institution-section"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <motion.img 
          src={'/NItK_logo.png'} 
          alt="NITK Logo" 
          className="nitk-logo"
          initial={{ rotate: -5 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.5 }}
        />
        <div className="institution-info">
          <h3>National Institute of Technology Karnataka, Surathkal</h3>
          <p>Department of Information Technology</p>
          <p>Artificial Intelligence</p>
          <p>Smart System Design Project - 2025</p>
        </div>
      </motion.div>

      <motion.div 
        className="team-card"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="team-members">
          {teamMembers.map((member) => (
            <motion.div 
              key={member.id} 
              className="member-card"
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05,
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="photo-container">
                <img src={member.photo} alt={member.name} />
              </div>
              <h3>{member.name}</h3>
              <p>{member.roll}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div 
        className="about-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <h2>About The Project</h2>
        <p>
          The Mangalore Smart City project is a comprehensive urban development initiative 
          aimed at transforming Mangalore into a sustainable, technologically advanced, and 
          citizen-friendly city. Our team has developed this Smart System Design solution to 
          address key urban challenges and enhance the quality of life for residents.
        </p>
        <p>
          This project leverages cutting-edge technologies including IoT, data analytics, and 
          interactive visualization to provide real-time insights and facilitate better 
          decision-making for city administrators and citizens alike.
        </p>
        <p>
          Developed at the National Institute of Technology Karnataka, Surathkal, this project 
          represents the culmination of our academic learning and practical application in the 
          field of Smart City development.
        </p>
      </motion.div>
    </div>
  );
};

export default About;
