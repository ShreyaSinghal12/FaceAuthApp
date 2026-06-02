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
                console.log('Nothing to sync');
                return;
            }

            console.log('Syncing ' + unsynced.length + ' records...');

            // Simulate AWS upload (mock for demo - replace with real endpoint in production)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mark all as synced
            const ids = unsynced.map((r: any) => r.id);
            await DatabaseService.markAsSynced(ids);

            console.log('Synced ' + unsynced.length + ' records successfully');
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