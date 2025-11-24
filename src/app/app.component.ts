import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatchService } from './match.service';
import { MatchState, MapInfo } from './models';
const TEAM_A_NAME = 'Team A';
const TEAM_B_NAME = 'Team B';
const TEAM_A_INDEX = 0;
const TEAM_B_INDEX = 1;
const DEFAULT_SLOTS_PER_TEAM = 1;
const BAN_PHASE_ID = 0;
const PICK_PHASE_ID = 1;
const COMPLETED_PHASE_ID = 2;
const UNASSIGNED_MAP_ID = 0;
@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent {
    
    title = 'Valorant BO3 Map Veto';

    teamAName = TEAM_A_NAME;
    teamBName = TEAM_B_NAME;
    slotsPerTeam = DEFAULT_SLOTS_PER_TEAM;

    matchId = '';
    match?: MatchState;

    myMatchId = '';           // text box for users joining specific match and team
    myTeamIndex: number | null = null;  


    selectedTeamIndex = TEAM_A_INDEX;          
    selectedAction: 'ban' | 'pick' = 'ban';

    loading = false;
    errorMessage = '';

    constructor(private matchService: MatchService) { }

    ngOnInit() {
        // Poll every 2 seconds
        setInterval(() => {
            if (this.matchId) {
                this.loadState();
            }
        }, 2000);
    }

    createMatch() {
        this.errorMessage = '';
        this.loading = true;
        console.log('Creating match...', this.teamAName, this.teamBName, this.slotsPerTeam);

        this.matchService.createMatch(this.teamAName, this.teamBName, this.slotsPerTeam)
            .subscribe({
                next: resp => {
                    console.log('Create match result:', resp);
                    this.matchId = resp.matchId;
                    this.loading = false;          
                    this.loadState();              
                },
                error: err => {
                    console.error('Create match error:', err);
                    this.errorMessage = 'Failed to create match';
                    this.loading = false;
                }
            });
    }

    joinMatch() {
        this.errorMessage = '';
        if (!this.myMatchId) {
            this.errorMessage = 'Enter a match ID to join.';
            return;
        }
        if (this.myTeamIndex === null) {
            this.errorMessage = 'Select a team index (0 or 1).';
            return;
        }

        this.matchId = this.myMatchId;
        this.loadState();   // fetch current state from server
    }


    loadState() {
        if (!this.matchId) return;
        console.log('Loading state for', this.matchId);

        this.matchService.getState(this.matchId)
            .subscribe({
                next: state => {
                    this.match = state;
                },
                error: err => {
                    console.error('Load state error:', err);
                    this.errorMessage = 'Failed to load state';
                }
            });
    }

    getPhaseLabel(): string {
        if (!this.match) return '';
        const p = Number(this.match.phase);
        switch (p) {
            case BAN_PHASE_ID: return 'Ban Phase';
            case PICK_PHASE_ID: return 'Pick Phase';
            case COMPLETED_PHASE_ID: return 'Completed';
            default: return `Phase ${p}`;
        }
    }

    getCurrentTeamName(): string {
        if (!this.match) return '';
        const idx = this.match.currentTurnTeam;
        return this.match.teams[idx]?.name ?? `Team ${idx}`;
    }

    getMapNameById(mapId: number): string {
        if (!this.match || mapId === UNASSIGNED_MAP_ID) return '';
        const map = this.match.availableMaps.find(m => m.id === mapId);
        return map ? map.name : `Map ${mapId}`;
    }

    isMapBanned(map: MapInfo): boolean {
        if (!this.match) return false;
        return this.match.teams.some(team => team.bannedMapIds.includes(map.id));
    }

    isMapPicked(map: MapInfo): boolean {
        if (!this.match) return false;
        return this.match.teams.some(team =>
            team.slots.some(slot => slot.mapId === map.id)
        );
    }
    // return true when the match is completed and this map is the decider
    isDecider(map: MapInfo): boolean {
        if (!this.match) return false;
        return Number(this.match.phase) === COMPLETED_PHASE_ID && this.match.deciderMapId === map.id;
    };

    onMapClick(map: MapInfo) {
        if (!this.matchId || !this.match) {
            this.errorMessage = 'Create or join a match first';
            return;
        }
        if (this.myTeamIndex === null) {
            this.errorMessage = 'Select your team in the Join section';
            return;
        }

        this.errorMessage = '';

        // Only allow actions on your turn
        if (this.match.currentTurnTeam !== this.myTeamIndex) {
            this.errorMessage = `It is currently ${this.getCurrentTeamName()}'s turn`;
            return;
        }

        // Decide action from server phase
        let action: 'ban' | 'pick';
        if (this.match.phase === BAN_PHASE_ID) {
            action = 'ban';
        } else if (this.match.phase === PICK_PHASE_ID) {
            action = 'pick';
        } else {
            this.errorMessage = 'Match is already completed';
            return;
        }

        this.loading = true;
        this.matchService.applyAction(this.matchId, this.myTeamIndex, action, map.id)
            .subscribe({
                next: state => {
                    console.log('Action result:', state);
                    this.match = state;
                    this.loading = false;
                },
                error: err => {
                    console.error('Action error:', err);
                    this.errorMessage = 'Action failed (server rejected it)';
                    this.loading = false;
                }
            });
    }


}
