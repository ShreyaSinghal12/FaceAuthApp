import NetInfo from '@react-native-community/netinfo';
import { DatabaseService } from './DatabaseService';

export const SyncService = {

  async sync(): Promise<void> {
    try {
      const pending = await DatabaseService.getUnsyncedCount();
      if (pending === 0) {
        console.log('Nothing to sync');
        return;
      }
      console.log('Syncing ' + pending + ' records...');
      // Simulate AWS upload (mock for demo)
      await new Promise(resolve => setTimeout(resolve, 1500));
      await DatabaseService.syncAll();
      console.log('Synced ' + pending + ' records successfully');
    } catch (error) {
      console.log('Sync failed (will retry when online):', error);
    }
  },

  startAutoSync(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        this.sync();
      }
    });
  },
};