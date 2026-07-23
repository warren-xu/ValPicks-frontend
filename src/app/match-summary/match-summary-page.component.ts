import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchService } from '../match.service';
import { MatchState, MapInfo } from '../models';
import { Subscription } from 'rxjs';

const TEAM_A = 0;
const TEAM_B = 1;
const ATTACK_SIDE_ID = 0;
const DEFEND_SIDE_ID = 1;
const SIDE_ACTION_ID = 2;

@Component({
  standalone: true,
  selector: 'app-match-preview',
  imports: [CommonModule],
  templateUrl: './match-summary-page.component.html',
  styleUrls: ['./match-summary-page.component.css']
})
export class MatchPreviewComponent implements OnInit, OnDestroy {
  matchId = '';
  match?: MatchState;
  loading = true;
  errorMessage = '';
  
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService
  ) {}

  ngOnInit(): void {
    this.matchId = this.route.snapshot.paramMap.get('id') || '';
    
    if (!this.matchId) {
      this.goHome();
      return;
    }

    this.sub = this.matchService.getState(this.matchId).subscribe({
      next: (state) => {
        this.match = state;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Could not load match results.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  isBo1(): boolean {
    return !!this.match && this.match.seriesType === 'bo1';
  }

  isBo3(): boolean {
    return !!this.match && this.match.seriesType === 'bo3';
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  viewMatchLog(): void {
    this.router.navigate(['/match', this.matchId]);
  }

  // Bo1 Helpers
  getDeciderMapName(): string {
    if (!this.match || !this.match.deciderMapId) return '';
    return this.getMapNameById(this.match.deciderMapId);
  }

  getDeciderMapUrl(): string {
    if (!this.match || !this.match.deciderMapId) return '';
    const map = this.match.availableMaps.find(m => m.id === this.match!.deciderMapId);
    return map && map.mapImgUrl ? map.mapImgUrl : "";
  }

  getAttackingTeamName(): string {
    if (!this.match) return 'TBD';
    
    const picker = this.match.deciderSidePickerTeam;
    // In case backend logic isn't working, return TBD instead of duplicate teams
    if (picker === -1 || this.match.deciderSide === -1) return 'TBD';

    const other = picker === TEAM_A ? TEAM_B : TEAM_A;
    return this.match.deciderSide === ATTACK_SIDE_ID
      ? this.match.teams[picker].name
      : this.match.teams[other].name;
  }

  getDefendingTeamName(): string {
    if (!this.match) return 'TBD';
    
    const picker = this.match.deciderSidePickerTeam;
    if (picker === -1 || this.match.deciderSide === -1) return 'TBD';

    const other = picker === TEAM_A ? TEAM_B : TEAM_A;
    return this.match.deciderSide === DEFEND_SIDE_ID
      ? this.match.teams[picker].name
      : this.match.teams[other].name;
  }

  private getMapNameById(mapId: number): string {
    if (!this.match || !mapId) return '';
    const map = this.match.availableMaps.find((m) => m.id === mapId);
    return map ? map.name : `Map ${mapId}`;
  }

  // Bo3 helpers

  private getMapPickerTeamName(mapId: number): string | undefined {
    if (!this.match) return undefined;
    const team = this.match.teams.find((t) => t.pickedMapIds.includes(mapId));
    return team?.name;
  }

  private getDefendingTeamNameForMap(mapId: number): string {
    if (!this.match || !this.match.steps) return 'TBD';

    if (this.match.deciderMapId === mapId) {
      const picker = this.match.deciderSidePickerTeam;
      const side = this.match.deciderSide;
      if (picker === -1 || side === -1) return 'TBD';

      const other = picker === TEAM_A ? TEAM_B : TEAM_A;
      return side === DEFEND_SIDE_ID
        ? this.match.teams[picker].name
        : this.match.teams[other].name;
    }

    const stepIndex = this.match.steps.findIndex(
      (s, i) =>
        s.action === SIDE_ACTION_ID && this.match!.stepMapIds?.[i] === mapId
    );

    if (stepIndex !== -1) {
      const step = this.match.steps[stepIndex];
      const sideVal = this.match.stepSideVals?.[stepIndex];
      const pickerIdx = step.teamIndex;
      const otherIdx = pickerIdx === TEAM_A ? TEAM_B : TEAM_A;

      if (sideVal !== ATTACK_SIDE_ID && sideVal !== DEFEND_SIDE_ID) return 'TBD';

      return sideVal === DEFEND_SIDE_ID
        ? this.match.teams[pickerIdx].name
        : this.match.teams[otherIdx].name;
    }

    return 'TBD';
  }

  getBo3MapCardsData() {
    if (!this.match) return [];
    const cards = [];
    const getImg = (m: MapInfo) => m.mapImgUrl || m.previewUrl || '';

    // Team A map pick
    if (this.match.teams[TEAM_A].pickedMapIds.length > 0) {
      const mapId = this.match.teams[TEAM_A].pickedMapIds[0];
      const map = this.match.availableMaps.find(m => m.id === mapId);
      if (map) {
        cards.push({
          mapName: map.name,
          imageUrl: getImg(map),
          pickLabel: this.getMapPickerTeamName(map.id) ?? 'TBD',
          defTeam: this.getDefendingTeamNameForMap(map.id),
          accentClass: 'accent-cyan'
        });
      }
    }

    // Team B Map pick
    if (this.match.teams[TEAM_B].pickedMapIds.length > 0) {
      const mapId = this.match.teams[TEAM_B].pickedMapIds[0];
      const map = this.match.availableMaps.find(m => m.id === mapId);
      if (map) {
        cards.push({
          mapName: map.name,
          imageUrl: getImg(map),
          pickLabel: this.getMapPickerTeamName(map.id) ?? 'TBD',
          defTeam: this.getDefendingTeamNameForMap(map.id),
          accentClass: 'accent-red'
        });
      }
    }

    // Decider Map
    if (this.match.deciderMapId) {
      const mapId = this.match.deciderMapId;
      const map = this.match.availableMaps.find(m => m.id === mapId);
      if (map) {
        cards.push({
          mapName: map.name,
          imageUrl: getImg(map),
          pickLabel: 'DECIDER',
          defTeam: this.getDefendingTeamNameForMap(mapId),
          accentClass: 'accent-white'
        });
      }
    }
    return cards;
  }
}