import React from 'react';
import Tickets from './Tickets';

const MyTasks: React.FC = () => {
  return (
    <div className="h-full">
      <Tickets mode="my-tasks" />
    </div>
  );
};

export default MyTasks;
