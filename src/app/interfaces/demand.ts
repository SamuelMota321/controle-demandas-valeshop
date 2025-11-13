interface Demanda {
  id: number;
  title: string;
  priority: number;
  status: string;
  date: string; // Deadline
  createdAt: string; // Creation date
  completionDate?: string;
  description: string;
  owner: string;
  gitLink: string;
  problems: string[] | null;
  observations: string[] | null;
  comments: string[] | null;
}