// One generic workflow contract keeps future use cases consistent without introducing an empty shared command hierarchy.
export interface UseCase<TRequest, TResult = void> {
  handle(request: TRequest): Promise<TResult>
}
