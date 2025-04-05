// scripts/initializeFirebase.js
// Run this script to populate your Firebase database with initial data

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample exams data
const exams = [
  {
    id: "exam1",
    title: "CompTIA A+ Certification",
    category: "IT",
    description: "Validate your understanding of hardware, software, and operational procedures.",
    longDescription: "This certification is designed for IT professionals looking to validate their skills and advance their careers. The exam covers a wide range of topics including PC hardware, networking, mobile devices, security, and troubleshooting.",
    price: 99.99,
    duration: "90 minutes",
    questionCount: 90,
    difficulty: "Intermediate",
    popularity: 4.8,
    thumbnail: "data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"100\" viewBox=\"0 0 160 100\"%3E%3Crect width=\"160\" height=\"100\" fill=\"%23275d8b\"/%3E%3Ctext x=\"80\" y=\"50\" font-family=\"Arial\" font-size=\"18\" text-anchor=\"middle\" fill=\"white\"%3EA+%3C/text%3E%3C/svg%3E"
  },
  {
    id: "exam2",
    title: "AWS Certified Solutions Architect",
    category: "Cloud",
    description: "Master designing distributed systems on the AWS platform.",
    longDescription: "The AWS Certified Solutions Architect - Associate exam is intended for individuals who perform a solutions architect role. This exam validates an examinee's ability to effectively demonstrate knowledge of how to architect and deploy secure and robust applications on AWS technologies.",
    price: 149.99,
    duration: "120 minutes",
    questionCount: 65,
    difficulty: "Advanced",
    popularity: 4.9,
    thumbnail: "data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"100\" viewBox=\"0 0 160 100\"%3E%3Crect width=\"160\" height=\"100\" fill=\"%23f90\"/%3E%3Ctext x=\"80\" y=\"50\" font-family=\"Arial\" font-size=\"18\" text-anchor=\"middle\" fill=\"white\"%3EAWS%3C/text%3E%3C/svg%3E"
  },
  {
    id: "exam3",
    title: "Certified Scrum Master (CSM)",
    category: "Project Management",
    description: "Learn Scrum methodologies and how to facilitate Scrum processes.",
    longDescription: "This certification validates your knowledge of Scrum principles and your skill in facilitating Scrum team processes. The exam covers the Scrum framework, Agile methodologies, and best practices for successful project delivery.",
    price: 129.99,
    duration: "60 minutes",
    questionCount: 50,
    difficulty: "Intermediate",
    popularity: 4.7,
    thumbnail: "data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"100\" viewBox=\"0 0 160 100\"%3E%3Crect width=\"160\" height=\"100\" fill=\"%234b9b4b\"/%3E%3Ctext x=\"80\" y=\"50\" font-family=\"Arial\" font-size=\"18\" text-anchor=\"middle\" fill=\"white\"%3ECSM%3C/text%3E%3C/svg%3E"
  }
];

// Sample questions data
const questions = [
  // CompTIA A+ questions
  {
    examId: "exam1",
    text: "What is the primary purpose of an operating system?",
    options: [
      "To display graphics on the screen",
      "To create documents and spreadsheets",
      "To manage hardware resources and provide a user interface",
      "To protect against malware"
    ],
    correctAnswer: 2
  },
  {
    examId: "exam1",
    text: "Which of the following is an example of volatile memory?",
    options: [
      "RAM",
      "Hard Disk Drive",
      "SSD",
      "ROM"
    ],
    correctAnswer: 0
  },
  {
    examId: "exam1",
    text: "What is the purpose of a firewall?",
    options: [
      "To cool down the computer",
      "To filter network traffic based on security rules",
      "To encrypt data on the hard drive",
      "To speed up internet connection"
    ],
    correctAnswer: 1
  },
  
  // AWS questions
  {
    examId: "exam2",
    text: "Which AWS service is designed primarily for NoSQL databases?",
    options: [
      "Amazon RDS",
      "Amazon DynamoDB",
      "Amazon Redshift",
      "Amazon Aurora"
    ],
    correctAnswer: 1
  },
  {
    examId: "exam2",
    text: "Which AWS service would you use to deploy your application as a dockerized container?",
    options: [
      "AWS Lambda",
      "Amazon EC2",
      "Amazon ECS",
      "Amazon S3"
    ],
    correctAnswer: 2
  },
  {
    examId: "exam2",
    text: "Which AWS service provides a virtual private cloud?",
    options: [
      "AWS VPC",
      "Amazon CloudFront",
      "AWS Direct Connect",
      "Amazon Route 53"
    ],
    correctAnswer: 0
  },
  
  // Scrum Master questions
  {
    examId: "exam3",
    text: "What is the recommended size of a Scrum development team?",
    options: [
      "3-9 people",
      "10-15 people",
      "15-20 people",
      "As many as needed for the project"
    ],
    correctAnswer: 0
  },
  {
    examId: "exam3",
    text: "Who is responsible for prioritizing the product backlog?",
    options: [
      "Scrum Master",
      "Development Team",
      "Product Owner",
      "Project Manager"
    ],
    correctAnswer: 2
  },
  {
    examId: "exam3",
    text: "What is the maximum recommended duration for the Daily Scrum?",
    options: [
      "15 minutes",
      "30 minutes",
      "1 hour",
      "However long is needed"
    ],
    correctAnswer: 0
  }
];

async function initializeDatabase() {
  try {
    console.log("Starting database initialization...");
    
    // Add exams
    for (const exam of exams) {
      console.log(`Adding exam: ${exam.title}`);
      await setDoc(doc(db, "exams", exam.id), exam);
    }
    
    // Add questions
    for (const question of questions) {
      console.log(`Adding question for exam: ${question.examId}`);
      await addDoc(collection(db, "questions"), question);
    }
    
    console.log("Database initialization completed successfully!");
  } catch (error) {
    console.error("Error initializing the database:", error);
  }
}

// Run the initialization
initializeDatabase();