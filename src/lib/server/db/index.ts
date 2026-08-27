import { Client } from 'cassandra-driver';
import { env } from '$env/dynamic/private';
import { KEYSPACE } from './schema';

export const client = new Client({
  contactPoints: [env.SCYLLA_HOST || 'localhost'],
  localDataCenter: env.SCYLLA_DATACENTER || 'datacenter1'
});

export { KEYSPACE };
