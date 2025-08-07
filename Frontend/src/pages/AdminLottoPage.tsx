import React, { useState } from 'react';

// Import หน้าที่ต้องการนำมาแสดง
import UserManagementPage from './UserManagementPage';  
import LottoRoundsManagementPage from '../components/LottoRoundManagementForm';
import LottoRoundsAddLottoryWin from './LottoryRoundsAddLottoryWin';
import LottoTypeManagementPage from './LottoryTypeManagementPage';
import ManualLottoAddForm from './ManualLottoAddForm';
import { useAuth } from '../contexts/AuthContext';

const AdminLottoPage: React.FC = () => { 

    const { user} = useAuth();


    return (
      <div className="">
        {(user?.role === 'owner') && < UserManagementPage /> }
        {(user?.role === 'owner' || user?.role === 'admin') && < LottoRoundsManagementPage />}
        {(user?.role === 'owner' || user?.role === 'admin') &&< LottoRoundsAddLottoryWin />}
        {(user?.role === 'owner') && < LottoTypeManagementPage />}
        {(user?.role === 'owner') && < ManualLottoAddForm />}
      </div>
    );
};

export default AdminLottoPage;