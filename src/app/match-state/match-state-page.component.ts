import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatchService } from '../match.service';
import { MatchState, MapInfo } from '../models';
import { MatchSocketService } from '../match-socket.service';
import { HttpParams } from '@angular/common/http';

const BAN_PHASE_ID = 0;
const PICK_PHASE_ID = 1;
const COMPLETED_PHASE_ID = 2;

type Role = 'captain' | 'spectator' | null;

interface CaptainAuthStored {
  role?: Role;
  team?: number;
  token?: string;
}

@Component({
  standalone: true,
  selector: 'app-match-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './match-state-page.component.html',
  styleUrls: ['./match-state-page.component.css'],
})
export class MatchStatePageComponent implements OnInit, OnDestroy {
  readonly BAN_PHASE_ID = BAN_PHASE_ID;
  readonly PICK_PHASE_ID = PICK_PHASE_ID;
  readonly COMPLETED_PHASE_ID = COMPLETED_PHASE_ID;

  // Basic state 
  matchId = '';
  match?: MatchState;
  loading = false;
  errorMessage = '';

  // Identity / auth 
  myTeamIndex: number | null = null;
  role: Role = null;
  captainToken: string | null = null;

  // Internals
  private wsSub?: Subscription;

  // GIF mapping for decider previews
  private readonly DECIDER_GIF_BY_KEYWORD: Record<string, string> = {
    abyss: 'assets/maps/abyss.gif',
    ascent: 'public/ascent.webp',
    corrode: 'assets/maps/corrode.gif',
    haven: 'assets/maps/haven.gif',
    pearl: 'assets/maps/pearl.gif',
    split: 'assets/maps/split.gif',
    sunset: 'assets/maps/sunset.gif',
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly matchService: MatchService,
    private readonly matchSocket: MatchSocketService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  // Lifecycle 

  ngOnInit(): void {
    this.subscribeToRouteParams();
    this.subscribeToMatchUpdates();
  }

  ngOnDestroy(): void {
    this.matchSocket.disconnect();
    this.wsSub?.unsubscribe();
  }

  // Public handlers 

  onMapHoverEnter(video: HTMLVideoElement | null): void {
    if (!video) return;
    try {
      video.muted = true;
      video.disablePictureInPicture = true;
      video.currentTime = 0;
      video.play();
    } catch (e) {
      console.warn('Could not play preview video', e);
    }
  }

  onMapHoverLeave(video: HTMLVideoElement | null): void {
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }

  onMapClick(map: MapInfo): void {
    if (!this.matchId || !this.match) {
      this.errorMessage = 'Create or join a match first';
      return;
    }

    if (!this.isCurrentUserCaptain()) {
      this.errorMessage = 'Only team captains can make picks/bans';
      return;
    }

    if (!this.isCurrentTeamTurn()) {
      this.errorMessage = `It is currently ${this.getCurrentTeamName()}'s turn`;
      return;
    }

    const action = this.getCurrentActionType();
    if (!action) {
      this.errorMessage = 'Match is already completed';
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    this.matchService
      .applyAction(
        this.matchId,
        this.myTeamIndex!,
        action,
        map.id,
        this.captainToken!
      )
      .subscribe({
        next: (state) => {
          this.match = state;
          this.loading = false;
        },
        error: (err) => {
          console.error('Action error:', err);
          this.errorMessage = 'Action rejected by server';
          this.loading = false;
        },
      });
  }

  // Helpers

  getPhaseLabel(): string {
    if (!this.match) return '';
    const p = Number(this.match.phase);
    switch (p) {
      case BAN_PHASE_ID:
        return 'Ban Phase';
      case PICK_PHASE_ID:
        return 'Pick Phase';
      case COMPLETED_PHASE_ID:
        return 'Completed';
      default:
        return `Phase ${p}`;
    }
  }

  getCurrentTeamName(): string {
    if (!this.match) return '';
    const idx = this.match.currentTurnTeam;
    return this.match.teams[idx]?.name ?? `Team ${idx}`;
  }

  getMapNameById(mapId: number): string {
    if (!this.match || !mapId) return '';
    const map = this.match.availableMaps.find((m) => m.id === mapId);
    return map ? map.name : `Map ${mapId}`;
  }

  isMapBanned(map: MapInfo): boolean {
    if (!this.match) return false;
    return this.match.teams.some((team) =>
      team.bannedMapIds.includes(map.id)
    );
  }

  isMapPicked(map: MapInfo): boolean {
    if (!this.match) return false;
    return this.match.teams.some((team) => team.pickedMapIds.includes(map.id));
  }

  isDecider(map: MapInfo): boolean {
    if (!this.match) return false;
    return (
      Number(this.match.phase) === COMPLETED_PHASE_ID &&
      this.match.deciderMapId === map.id
    );
  }

  isBo1(): boolean {
    return !!this.match && this.match.seriesType === 'bo1';
  }

  isBo3(): boolean {
    return !!this.match && this.match.seriesType === 'bo3';
  }

  getTeamPickedMapNames(teamIndex: number): string[] {
    if (!this.match) return [];
    const team = this.match.teams[teamIndex];
    if (!team) return [];
    return team.pickedMapIds
      .map((id) => this.getMapNameById(id))
      .filter(Boolean);
  }

  getDeciderMapName(): string {
    if (!this.match || !this.match.deciderMapId) return '';
    return this.getMapNameById(this.match.deciderMapId);
  }

  /* getDeciderMapGif(): string | null {
    const name = this.getDeciderMapName();
    if (!name) return null;

    const lower = name.toLowerCase();
    for (const key of Object.keys(this.DECIDER_GIF_BY_KEYWORD)) {
      if (lower.includes(key)) {
        return this.DECIDER_GIF_BY_KEYWORD[key];
      }
    }
    return 'assets/maps/default.gif';
  } */

  // Private helpers

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private subscribeToRouteParams(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) return;

      this.matchId = id;
      const teamParam = params.get('teamIndex');
      this.initializeIdentityFromRoute(id, teamParam);
      this.initMatchWithWebSocket(id);
    });
  }

  private subscribeToMatchUpdates(): void {
    this.wsSub = this.matchSocket.matchState$.subscribe((state) => {
      if (state) {
        this.match = state;
      }
    });
  }

  private initializeIdentityFromRoute(
    matchId: string,
    teamParam: string | null
  ): void {
    if (teamParam === null) {
      this.setSpectator(matchId);
      return;
    }

    const teamIndex = Number(teamParam);
    this.myTeamIndex = isNaN(teamIndex) ? null : teamIndex;

    if (!this.isBrowser) {
      // SSR fallback
      this.role = null;
      this.captainToken = null;
      return;
    }

    const storedRaw = localStorage.getItem(
      `match_${matchId}_team_${teamParam}_auth`
    );

    if (!storedRaw) {
      this.setSpectator(matchId);
      return;
    }

    try {
      const parsed: CaptainAuthStored = JSON.parse(storedRaw);
      this.role = parsed.role ?? 'captain';
      this.myTeamIndex =
        typeof parsed.team === 'number' ? parsed.team : teamIndex;
      this.captainToken = parsed.token ?? null;
    } catch {
      // If parsing fails, assume captain but without token
      this.role = 'captain';
      this.captainToken = null;
    }
  }

  private setSpectator(matchId: string): void {
    this.role = 'spectator';
    this.myTeamIndex = null;
    this.captainToken = null;
    this.router.navigate(['/match', matchId], {replaceUrl: true})
  }

  private initMatchWithWebSocket(id: string): void {
    this.matchService.getState(id).subscribe({
      next: (state) => {
        this.match = state;
        this.matchSocket.connect(id);
      },
      error: (err) => {
        console.error('Initial load error', err);
        this.errorMessage = 'Failed to load match. Redirecting...';
        this.router.navigate(['/']);
      },
    });
  }

  private isCurrentUserCaptain(): boolean {
    return this.role === 'captain' && this.myTeamIndex !== null && !!this.captainToken;
  }

  private isCurrentTeamTurn(): boolean {
    if (!this.match) return false;
    return this.match.currentTurnTeam === this.myTeamIndex;
  }

  private getCurrentActionType(): 'ban' | 'pick' | null {
    if (!this.match) return null;
    if (this.match.phase === BAN_PHASE_ID) return 'ban';
    if (this.match.phase === PICK_PHASE_ID) return 'pick';
    return null;
  }
}
