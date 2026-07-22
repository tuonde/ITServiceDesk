using System.Linq.Expressions;
using ITServiceDesk.Core.Entities;

namespace ITServiceDesk.Core.Interfaces.Repositories;

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id);
    Task<T?> GetAsync(Expression<Func<T, bool>> expression);
    Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? expression = null);
    IQueryable<T> Query();
    Task AddAsync(T entity);
    void Update(T entity);
    void Remove(T entity);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
