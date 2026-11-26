const work = async (): Promise<number> => Promise.resolve(1);

export const run = (): void => {
  work();
};
