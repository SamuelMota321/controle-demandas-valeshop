import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ContainerModule } from '../../components/container/container.module';
import { PainelService } from '../../services/painel.service';
import { AuthService } from '../../services/auth.service';
// Importa o Observable, Subscription, forkJoin e of
import { Observable, of, Subscription, forkJoin } from 'rxjs';
import { ConfirmationModal } from './confirmation-modal/confirmation-modal';
import { take, filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { ReplacePipe } from '../../util/replace.pipe';

// Adicionando interface User para garantir a tipagem correta
interface User {
  id: number;
  email: string;
}

@Component({
  selector: 'app-demandas',
  standalone: true,
  imports: [
    CommonModule,
    ContainerModule,
    RouterLink,
    DatePipe,
    ConfirmationModal,
    FormsModule,
    ReplacePipe,
  ],
  templateUrl: './demandas.html',
  styleUrl: './demandas.scss',
})
export class Demandas implements OnInit, OnDestroy {
  demandas: any[] = [];
  demandasFiltradas: any[] = [];
  demandasPaginadas: any[] = [];
  usuarios: User[] = []; 
  termoBusca = '';
  isLoading = true;
  isModalOpen = false;
  demandaParaExcluir: number | null = null;
  isAdmin = false;
  private authSubscription: Subscription | undefined;

  filtros = {
    funcionarioId: 'todos',
    prioridade: 'todas',
    dataInicio: '',
    dataFim: ''
  };

  paginaAtual = 1;
  itensPorPagina = 5;

  constructor(
    private painelService: PainelService,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.authSubscription = this.authService.user$.pipe(
      filter(user => user !== null), 
      take(1) 
    ).subscribe(user => {
      this.isAdmin = user?.userType?.toLowerCase() === 'administrador';
      this.loadDadosIniciais(); // Chama a nova função de carregamento
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  /**
   * Lógica de carregamento de dados unificada com forkJoin, 
   * inspirada no dashboard.ts.
   */
  loadDadosIniciais(): void {
    this.isLoading = true;

    // Define quais observables serão chamados com base no tipo de usuário
    const observables: { demandas: Observable<any>, usuarios: Observable<any> } = {
      demandas: this.isAdmin
        ? this.painelService.getAllDemandRecord()
        : this.painelService.getUserAllDemandRecord(),
        
      usuarios: this.isAdmin
        ? this.painelService.getAllUsers()
        : of([]) // Se não for admin, retorna um observable com um array vazio
    };

    // Usa forkJoin para esperar que ambos os observables terminem
    forkJoin(observables).subscribe({
      next: ({ demandas, usuarios }) => {
        this.demandas = demandas || [];
        this.usuarios = usuarios || []; // Popula os usuários (seja a lista de admin ou o array vazio)
        
        this.aplicarTodosFiltros(); // Agora isso é seguro, pois this.usuarios está definido
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.toastr.error('Erro ao carregar dados da página.', 'Erro');
        console.error(err); // Loga o erro para depuração
        this.cdr.detectChanges();
      }
    });
  }

  // A função loadUsuarios() foi removida pois agora está integrada em loadDadosIniciais()

  /**
   * Função central que aplica AMBOS os filtros (admin e barra de busca)
   */
  aplicarTodosFiltros(): void {
    let demandasResultantes = [...this.demandas];

    // 1. Aplica Filtros de Admin (se for admin)
    if (this.isAdmin) {
      // Filtro de Funcionário
      // A verificação this.usuarios.length > 0 é crucial aqui
      if (this.filtros.funcionarioId !== 'todos' && this.usuarios.length > 0) {
        const selectedUser = this.usuarios.find(u => u.id === Number(this.filtros.funcionarioId));
        if (selectedUser) {
          const ownerName = selectedUser.email.split('@')[0];
          demandasResultantes = demandasResultantes.filter(d => d.owner === ownerName);
        }
      }

      // Filtro de Prioridade
      if (this.filtros.prioridade !== 'todas') {
        demandasResultantes = demandasResultantes.filter(d => d.priority === Number(this.filtros.prioridade));
      }

      // Filtro de Data
      if (this.filtros.dataInicio || this.filtros.dataFim) {
        const dataInicio = this.filtros.dataInicio ? new Date(this.filtros.dataInicio) : null;
        const dataFim = this.filtros.dataFim ? new Date(this.filtros.dataFim) : null;

        if(dataInicio) dataInicio.setHours(0, 0, 0, 0);
        if(dataFim) dataFim.setHours(23, 59, 59, 999);

        demandasResultantes = demandasResultantes.filter(d => {
          const dataDemanda = new Date(d.createdAt);
          
          const afterStart = dataInicio ? dataDemanda >= dataInicio : true;
          const beforeEnd = dataFim ? dataDemanda <= dataFim : true;
          
          return afterStart && beforeEnd;
        });
      }
    }
    
    // 2. Aplica Filtro da Barra de Busca (para todos)
    const termo = this.termoBusca.toLowerCase();
    if (termo) {
      demandasResultantes = demandasResultantes.filter(demanda =>
        demanda.title.toLowerCase().includes(termo) ||
        (demanda.owner && demanda.owner.toLowerCase().includes(termo)) ||
        demanda.status.toLowerCase().includes(termo)
      );
    }

    // Atualiza a lista final e a paginação
    this.demandasFiltradas = demandasResultantes;
    this.paginaAtual = 1; 
    this.atualizarPaginacao();
    this.cdr.detectChanges(); // Garante que a UI atualize após filtros
  }

  /**
   * Esta função agora apenas chama a função central
   * (acionada pela barra de busca)
   */
  filtrarDemandas(): void {
    this.aplicarTodosFiltros();
  }
  
  /**
   * Esta função agora apenas chama a função central
   * (acionada pelo botão "Aplicar")
   */
  aplicarFiltros(): void {
    this.aplicarTodosFiltros();
  }
  
  /**
   * Limpa os filtros de admin e reaplica a lógica
   */
  limparFiltros(): void {
    this.filtros = {
      funcionarioId: 'todos',
      prioridade: 'todas',
      dataInicio: '',
      dataFim: ''
    };
    // Re-aplica os filtros (que agora só incluirão a barra de busca, se houver)
    this.aplicarTodosFiltros();
  }

  atualizarPaginacao(): void {
    const indiceInicial = (this.paginaAtual - 1) * this.itensPorPagina;
    const indiceFinal = indiceInicial + this.itensPorPagina;
    this.demandasPaginadas = this.demandasFiltradas.slice(indiceInicial, indiceFinal);
  }

  irParaPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaAtual = pagina;
      this.atualizarPaginacao();
    }
  }

  proximaPagina(): void {
    this.irParaPagina(this.paginaAtual + 1);
  }

  paginaAnterior(): void {
    this.irParaPagina(this.paginaAtual - 1);
  }

  totalPaginas(): number {
    return Math.ceil(this.demandasFiltradas.length / this.itensPorPagina);
  }

  getPaginas(): number[] {
    const total = this.totalPaginas();
    return Array.from({ length: total }, (_, i) => i + 1);
  }


  solicitarExclusao(demandaId: number): void {
    this.demandaParaExcluir = demandaId;
    this.isModalOpen = true;
  }

  fecharModal(): void {
    this.isModalOpen = false;
    this.demandaParaExcluir = null;
  }

  confirmarExclusao(): void {
    if (this.demandaParaExcluir === null) {
      return;
    }

    this.painelService.deleteDemand(this.demandaParaExcluir).subscribe({
      next: () => {
        this.toastr.success('Demanda excluída com sucesso!', 'Sucesso');
        // Remove a demanda da lista principal
        this.demandas = this.demandas.filter(
          (d) => d.id !== this.demandaParaExcluir
        );
        // Re-aplica os filtros para atualizar a visualização
        this.aplicarTodosFiltros(); 
        this.fecharModal();
      },
      error: (err) => {
        this.toastr.error('Erro ao excluir a demanda.', 'Erro');
        this.fecharModal();
      },
    });
  }

  verMais(demandaId: number): void {
    this.router.navigate(['/ver-mais', demandaId]);
  }


  getNomeAbreviado(name: string | null | undefined): string {
    if (!name) return 'N/A';
    const nome = name.split('@')[0];
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  }
}