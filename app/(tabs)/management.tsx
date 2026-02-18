// This tab redirects to the Camp Manager module for admins/managers
// And shows the Public Events Feed for donors/volunteers
import { useAuth } from '@/context/AuthContext';
import CampManagerScreen from '../camp-manager';
import EventsFeedScreen from '../events-feed';

export default function ManagementRoute() {
    const { role } = useAuth();
    // Donors see the pretty feed
    // Volunteers also see the feed (so they can join events), but maybe they also need manage tools?
    // For now, let's show the feed as per user request "events ui of the donors role"
    if (role === 'donor' || role === 'volunteer') {
        return <EventsFeedScreen />;
    }
    return <CampManagerScreen />;
}
