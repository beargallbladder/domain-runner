declare module 'pg' {
    export class Pool {
        constructor(config?: PoolConfig);
        connect(): Promise<PoolClient>;
        query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
        end(): Promise<void>;
    }

    export class Client {
        constructor(config?: ClientConfig);
        connect(): Promise<void>;
        query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
        end(): Promise<void>;
    }

    export interface PoolClient extends Client {
        release(err?: Error): void;
    }

    export interface QueryResult<T> {
        rows: T[];
        rowCount: number;
        command: string;
        fields: FieldDef[];
    }

    export interface FieldDef {
        name: string;
        tableID: number;
        columnID: number;
        dataTypeID: number;
        dataTypeSize: number;
        dataTypeModifier: number;
        format: string;
    }

    export interface ClientConfig {
        user?: string;
        password?: string;
        host?: string;
        database?: string;
        port?: number;
        connectionString?: string;
        ssl?: boolean | SSLConfig;
    }

    export interface PoolConfig extends ClientConfig {
        max?: number;
        min?: number;
        idleTimeoutMillis?: number;
        connectionTimeoutMillis?: number;
    }

    interface SSLConfig {
        rejectUnauthorized?: boolean;
        ca?: string;
        key?: string;
        cert?: string;
    }
} 