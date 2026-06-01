import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { DatabaseService } from './DatabaseService';

const AWS_ENDPOINT = 'https://your-aws-api.execute-api.region.amazonaws.com/attendance';

export const SyncService = {

  async syncIfOnline(): Promise<void> {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log('📵 Offline — sync skipped');
      return;
    }
    console.log('🌐 Online — starting sync...');
    await this.sync();
  },

  async sync(): Promise<void> {
    try {
      const unsynced = await DatabaseService.getUnsyncedLogs();

      if (unsynced.length === 0) {
        console.log('✅ Nothing to sync');
        return;
      }

      console.log(`Syncing ${unsynced.length} records...`);

      const response = await axios.post(AWS_ENDPOINT, {
        records: unsynced,
        syncedAt: Date.now(),
      });

      if (response.status === 200) {
        const ids = unsynced.map((r: any) => r.id);
        await DatabaseService.markAsSynced(ids);
        await DatabaseService.purgeTemplates();
        console.log(`✅ Synced ${unsynced.length} records and purged templates`);
      }
    } catch (error) {
      console.log('Sync failed (will retry when online):', error);
    }
  },

  startAutoSync(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log('🌐 Network restored — auto syncing...');
        this.sync();
      }
    });
  },
};