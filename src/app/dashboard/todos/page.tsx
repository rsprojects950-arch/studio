import { TodoList } from "@/components/todos/todo-list";

export default function TodosPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <TodoList />
    </div>
  );
}
