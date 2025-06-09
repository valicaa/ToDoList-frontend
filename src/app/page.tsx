"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { ToDoListAbi, ToDoListAddress } from "@/utils";

import { Eip1193Provider } from "ethers";

// Define the shape of the injected ethereum object
declare global {
  interface Window {
    ethereum: Eip1193Provider;
  }
}

type ToDo = {
  id: bigint;
  name: string;
  description: string;
  deadline: bigint;
  completed: boolean;
  deleted: boolean;
};

const Home = () => {
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [todoItems, setTodoItems] = useState<ToDo[]>([]);
  const [isFetchingTodos, setIsFetchingTodos] = useState<boolean>(false);
  const [todoForm, setTodoForm] = useState<{name: string, description: string, deadline: string}>({name: "", description: "", deadline: ""});
  const [isCreatingTodo, setIsCreatingTodo] = useState<boolean>(false);
  const [isTogglingCompleted, setIsTogglingCompleted] = useState<boolean>(false);

  const connectWallet = async () => {
    if(isLoading) return;

    try{
      if(!window.ethereum){
        alert("Please install MetaMask!");
        return;
      }
      setIsLoading(true);
      const accounts = await (window.ethereum.request({method: "eth_requestAccounts"}));
      if(accounts.length > 0){
        setCurrentAccount(accounts[0]);
      }
    }catch(error){
        console.error("Error connecting wallet:", error);
      }finally{
        setIsLoading(false);
      }
    };

    const fetchTodos = useCallback(async () => {
      if (!currentAccount) return;
      try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(ToDoListAddress, ToDoListAbi, provider);

          console.log("Contract:", contract);
          console.log("Contract Address:", ToDoListAddress);
          console.log("Provider:", provider);
          console.log("Current Account:", currentAccount);
  
          setIsFetchingTodos(true);
          console.log("Fetching todos...");
  
          const todosFromContract = await contract.getTodos(currentAccount);
          console.log("Raw Proxy(Result) from contract:", todosFromContract);
  
          // --- THE FIX IS HERE: Manually build a new array ---
          const formattedTodos = [];
          for (let i = 0; i < todosFromContract.length; i++) {
              const todo = todosFromContract[i];
              formattedTodos.push({
                  id: todo.id,
                  name: todo.name,
                  description: todo.description,
                  deadline: todo.deadline,
                  completed: todo.completed,
                  deleted: todo.deleted
              });
          }
          
          console.log("Manually formatted array:", formattedTodos);
          setTodoItems(formattedTodos);
  
      } catch (error) {
          console.error("Error fetching todos:", error);
      } finally {
          setIsFetchingTodos(false);
      }
  }, [currentAccount]);

    const createTodo = async (event: React.FormEvent) => {
      event.preventDefault();
      try{
        if(!currentAccount){
          alert("Please connect your wallet first!");
          return;
        }
        if(todoForm.name.trim() === "" || todoForm.deadline.trim() === ""){
          alert("Name and deadline are required!");
          return;
        }
        if(new Date(todoForm.deadline) < new Date()){
          alert("Deadline must be in the future!");
          return;
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(ToDoListAddress, ToDoListAbi, signer);
        // Create a date object from the input
        const date = new Date(todoForm.deadline);
        // Set the time to the beginning of the day (in user's local timezone)
        date.setHours(0, 0, 0, 0);
        // Now convert that to a Unix timestamp
        const deadlineTimestamp = Math.floor(date.getTime() / 1000);
        setIsCreatingTodo(true);
        const tx = await contract.createTodo(todoForm.name, todoForm.description, deadlineTimestamp);
        await tx.wait();
        setTodoForm({name: "", description: "", deadline: ""});
        await fetchTodos();
      }catch(error){
        console.error("Error creating todo:", error);
      }finally{
        setIsCreatingTodo(false);
      }
    }

    const toggleCompleted = async (id: bigint) => {
      try{
        if(!currentAccount){
          alert("Please connect your wallet first!");
          return;
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(ToDoListAddress, ToDoListAbi, signer);
        setIsTogglingCompleted(true);
        const tx = await contract.toggleCompleted(id);
        await tx.wait();
        await fetchTodos();
      }catch(error){
        console.error("Error toggling todo:", error);
      }finally{
        setIsTogglingCompleted(false);
      }
    }

    const deleteTodo = async (todoId: bigint) => {
      try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(ToDoListAddress, ToDoListAbi, signer);
  
          const tx = await contract.deleteToDo(todoId);
          await tx.wait();
  
          await fetchTodos(); // Refresh the list
      } catch (error) {
          console.error("Error deleting todo:", error);
      }
  };

    useEffect(() => {
      const checkWalletConnection = async () => {
        if (window.ethereum) {
          const accounts = await (window.ethereum.request({ method: "eth_accounts" }));
          if (accounts.length > 0) {
            setCurrentAccount(accounts[0]);
          }
        }
      };
      checkWalletConnection();
    }, []);

    useEffect(()=>{
      if(currentAccount){
        fetchTodos();
      }
    }, [currentAccount, fetchTodos]);
  
    return (
      <main className="flex min-h-screen flex-col items-center p-8">
        <h1 className="text-4xl font-bold mb-8">My Decentralized Todo List</h1>
        <div>
          {!currentAccount ? (
            <button onClick={connectWallet} className="...">Connect Wallet</button>
          ) : (
            <div className="w-full max-w-2xl">
              <p className="text-lg mb-4">Connected as: <span className="font-mono ...">{currentAccount.substring(0, 6)}...{currentAccount.substring(currentAccount.length - 4)}</span></p>
               {/* --- DEBUGGING VIEW --- */}
               <div className="mt-4 p-2 border border-dashed border-yellow-500 text-left text-xs">
                        <h3 className="font-bold mb-2 text-yellow-500">Live State Debugger:</h3>
                        <pre className="whitespace-pre-wrap break-all">
                            {/* This will show us the raw content of the todoItems state */}
                            {JSON.stringify(todoItems, (key, value) =>
                                typeof value === 'bigint' ? value.toString() : value, 2)
                            }
                        </pre>
                    </div>
                    {/* --- END DEBUGGING VIEW --- */}
              {/* --- NEW: Create Todo Form --- */}
              <div className="p-6 bg-gray-900 rounded-lg shadow-xl mb-8">
                <h2 className="text-2xl font-semibold mb-4">Create a New Todo</h2>
                <form onSubmit={createTodo} className="space-y-4">
                  <input type="text" value={todoForm.name} onChange={(e) => setTodoForm({...todoForm, name: e.target.value})} placeholder="Todo Name" required className="w-full p-2 bg-gray-800 rounded border border-gray-700" />
                  <textarea value={todoForm.description} onChange={(e) => setTodoForm({...todoForm, description: e.target.value})} placeholder="Description" className="w-full p-2 bg-gray-800 rounded border border-gray-700" />
                  <input type="date" value={todoForm.deadline} onChange={(e) => setTodoForm({...todoForm, deadline: e.target.value})} required className="w-full p-2 bg-gray-800 rounded border border-gray-700" />
                  <button type="submit" disabled={isCreatingTodo} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-500">
                    {isCreatingTodo ? "Creating..." : "Create Todo"}
                  </button>
                </form>
              </div>
  
              {/* --- UI to display the list of todos --- */}
              <div className="mt-8">
                <h2 className="text-2xl font-semibold">Your Todos</h2>
                {isFetchingTodos ? ( <p>Loading...</p> ) : todoItems.length === 0 ? (
                  <p className="mt-4 text-gray-500">You have no todos yet.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {todoItems.filter((todo) => !todo.deleted).map((todo) => (
                      <li key={Number(todo.id)} className="p-4 bg-gray-800 rounded-lg ...">
                        <div>
                          <h3 className={`text-xl font-bold ${todo.completed ? 'line-through text-gray-500' : ''}`}>{todo.name}</h3>
                          <p className="text-gray-400">{todo.description}</p>
                          <p className="text-sm text-gray-500">Deadline: {new Date(Number(todo.deadline) * 1000).toLocaleString()}</p>
                        </div>
                        <button onClick={() => toggleCompleted(todo.id)} disabled={isTogglingCompleted} className={`px-3 py-1 rounded ${todo.completed ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                          {isTogglingCompleted ? 'Toggling...' : todo.completed ? 'Undo' : 'Complete'}
                        </button>
                        <button onClick={() => deleteTodo(todo.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                            Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    );
}

export default Home;