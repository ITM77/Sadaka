// Redux store for Sadaka Mobile App

import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

// Import slices (to be created)
// import authSlice from './slices/authSlice';
// import mosquesSlice from './slices/mosquesSlice';
// import campaignsSlice from './slices/campaignsSlice';
// import transactionsSlice from './slices/transactionsSlice';
// import savobSlice from './slices/savobSlice';

export const store = configureStore({
  reducer: {
    // auth: authSlice,
    // mosques: mosquesSlice,
    // campaigns: campaignsSlice,
    // transactions: transactionsSlice,
    // savob: savobSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
