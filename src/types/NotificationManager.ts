import { WorkState } from '../StateMachine';

export interface NotificationManager {
    onWorkStateChange: (state: WorkState) => void;
}
