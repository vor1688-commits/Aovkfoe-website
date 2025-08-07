import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;  
}
 
const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
   
  const cardClasses = `${className} bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700`;

  return (
    <div className={cardClasses}>
        <img src="" alt="" />
      <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h5>
      <div className="font-normal text-gray-700 dark:text-gray-400">
        {children}
      </div>
    </div>
  );
};

export default Card;