import { getData } from '@/server/data';
import { endpoint } from '@/server/http';
export const GET = endpoint(getData);
