export type D1ValueLike =
  | string
  | number
  | boolean
  | null
  | ArrayBuffer
  | Uint8Array;

export type D1ResultLike<Row = Record<string, unknown>> = {
  success: boolean;
  results?: Row[];
  meta?: {
    changes?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
};

export interface D1PreparedStatementLike {
  bind(...values: D1ValueLike[]): D1PreparedStatementLike;
  first<Row = Record<string, unknown>>(): Promise<Row | null>;
  run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]>;
}
