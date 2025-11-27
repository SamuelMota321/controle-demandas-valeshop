import { z } from 'zod';

export const demandaSchema = z.object({
  title: z.string().min(5, "O título deve ter no mínimo 5 caracteres"),
  status: z.string().min(1, "Selecione um status"),
  gitLink: z.string()
    .min(1, "O link do GitLab é obrigatório") // Garante que não esteja vazio
    .url("Insira uma URL válida")
    .startsWith("https://git.valeshop.com.br", "O link deve começar com https://git.valeshop.com.br"),
  date: z.string()
    .refine((val) => val.length > 0, "A data de prazo é obrigatória")
    .refine((val) => {
      if (!val) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      
      const dateParts = val.split('-');
      const inputDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      
      return inputDate >= today;
    }, "A data de prazo não pode ser anterior à data atual"),
  description: z.string()
    .min(10, "A descrição deve ter pelo menos 10 caracteres")
    .max(65535, "A descrição excedeu o limite de 65.535 caracteres")
});

type DemandaSchema = z.infer<typeof demandaSchema>;
