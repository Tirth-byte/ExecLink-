import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../core/constants/project_context.dart';
import '../models/execution_event.dart';
import '../models/schedule_activity.dart';
import '../models/match_proposal.dart';
import '../services/api_client.dart';
import '../services/offline_sync_service.dart';
import '../services/time_agent_extractor.dart';

// Service providers
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final offlineSyncServiceProvider = ChangeNotifierProvider<OfflineSyncService>((ref) {
  final api = ref.watch(apiClientProvider);
  return OfflineSyncService(apiClient: api);
});

// Offline Mode state
final offlineModeProvider = ChangeNotifierProvider<OfflineModeNotifier>((ref) {
  final syncService = ref.watch(offlineSyncServiceProvider);
  return OfflineModeNotifier(syncService);
});

class OfflineModeNotifier extends ChangeNotifier {
  final OfflineSyncService _syncService;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _disposed = false;

  OfflineModeNotifier(this._syncService) {
    _syncService.addListener(notifyListeners);
    if (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) {
      _subscription = Connectivity().onConnectivityChanged.listen((results) {
        final hasConnection = !results.contains(ConnectivityResult.none);
        _syncService.setNetworkAvailable(hasConnection);
      });
    }
  }

  bool get isOffline => _syncService.isOffline;
  bool get isSimulatedOffline => _syncService.simulateOffline;
  FieldConnectionState get connectionState => _syncService.connectionState;
  FieldSyncState get syncState => _syncService.syncState;
  DateTime? get lastSuccessfulSync => _syncService.lastSuccessfulSync;

  void setOffline(bool value) {
    _syncService.setSimulatedOffline(value);
  }

  @override
  void notifyListeners() {
    if (!_disposed) {
      super.notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _subscription?.cancel();
    _syncService.removeListener(notifyListeners);
    super.dispose();
  }
}

// Schedule Activities state
final activitiesProvider = ChangeNotifierProvider<ActivitiesNotifier>((ref) {
  final api = ref.watch(apiClientProvider);
  return ActivitiesNotifier(api)..loadActivities();
});

class ActivitiesNotifier extends ChangeNotifier {
  final ApiClient _api;
  bool isLoading = true;
  List<ScheduleActivity> activities = [];
  String? error;
  bool _disposed = false;

  ActivitiesNotifier(this._api);

  Future<void> loadActivities() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      activities = await _api.getActivities(ProjectContext.defaultProjectId);
      isLoading = false;
      notifyListeners();
    } catch (e) {
      isLoading = false;
      error = e.toString();
      notifyListeners();
    }
  }

  @override
  void notifyListeners() {
    if (!_disposed) {
      super.notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

// Events & Sync Queue state
final eventsProvider = ChangeNotifierProvider<EventsNotifier>((ref) {
  final syncService = ref.watch(offlineSyncServiceProvider);
  return EventsNotifier(syncService)..initialize();
});

class EventsNotifier extends ChangeNotifier {
  final OfflineSyncService _syncService;
  bool _disposed = false;

  EventsNotifier(this._syncService) {
    _syncService.addListener(notifyListeners);
  }

  Future<void> initialize() async {
    await _syncService.initialize();
  }

  List<ExecutionEvent> get events => _syncService.allEvents;
  int get pendingCount => _syncService.pendingCount;
  bool get isOffline => _syncService.isOffline;
  bool get isSimulatedOffline => _syncService.simulateOffline;
  FieldConnectionState get connectionState => _syncService.connectionState;
  FieldSyncState get syncState => _syncService.syncState;
  DateTime? get lastSuccessfulSync => _syncService.lastSuccessfulSync;
  bool get isSyncing => _syncService.isSyncing;

  void toggleOffline(bool value) {
    _syncService.setSimulatedOffline(value);
  }

  Future<ExecutionEvent> submitEvent(ExecutionEvent event) async {
    return _syncService.submitEvent(event);
  }

  Future<int> syncAllPending() async {
    return _syncService.syncPending();
  }

  MatchProposal? getProposalForEvent(String eventId) {
    return _syncService.proposals[eventId];
  }

  @override
  void notifyListeners() {
    if (!_disposed) {
      super.notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _syncService.removeListener(notifyListeners);
    super.dispose();
  }
}

// Time Agent State
final timeAgentProvider = ChangeNotifierProvider<TimeAgentNotifier>((ref) {
  return TimeAgentNotifier();
});

class TimeAgentNotifier extends ChangeNotifier {
  String transcript = '';
  List<ExtractionResult> multiFacts = [];
  int selectedFactIndex = 0;
  bool isExtracting = false;
  String? error;

  ExtractionResult? get extraction =>
      multiFacts.isNotEmpty && selectedFactIndex < multiFacts.length
      ? multiFacts[selectedFactIndex]
      : null;

  void setTranscript(String text) {
    transcript = text;
    if (text.trim().isNotEmpty) {
      parseTranscript(text);
    } else {
      multiFacts = [];
      selectedFactIndex = 0;
      notifyListeners();
    }
  }

  void parseTranscript(String text) {
    isExtracting = true;
    error = null;
    notifyListeners();
    try {
      multiFacts = TimeAgentExtractor.extractMultiFact(text);
      selectedFactIndex = 0;
      isExtracting = false;
      notifyListeners();
    } catch (e) {
      isExtracting = false;
      error = e.toString();
      notifyListeners();
    }
  }

  void selectFactIndex(int index) {
    if (index >= 0 && index < multiFacts.length) {
      selectedFactIndex = index;
      notifyListeners();
    }
  }

  void updateCurrentFact(ExtractionResult updated) {
    if (selectedFactIndex < multiFacts.length) {
      multiFacts[selectedFactIndex] = updated;
      notifyListeners();
    }
  }

  void updateExtractedFacts(ExtractionResult updated) {
    updateCurrentFact(updated);
  }

  void reset() {
    transcript = '';
    multiFacts = [];
    selectedFactIndex = 0;
    isExtracting = false;
    error = null;
    notifyListeners();
  }
}
