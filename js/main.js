var App = Ember.Application.create({
  LOG_TRANSITIONS: true
});

/** Routes
 */

App.ApplicationRoute = Ember.Route.extend({
  model: function() {
    return this.store.findAll('column');
  }
});

App.IndexRoute = Ember.Route.extend({
  model: function() {
    return this.store.findAll('column');
  }
});

/** Views
 */
App.ApplicationView = Ember.View.extend({
  didInsertElement: function(event) {
    var that = this;
    this.$().find('input.new-column').on('keypress', function(e) {
      if (e.which == 13) {
        var val = $(this).val();
        if ($.trim(val).length > 0) {
          that.get('controller').send('createColumn', val);
        }
        return false;
      }
    });
    
    this.$().find('ul.columns').sortable({
      axis: "y",
      cursor: "move",
      update: function() {
        var ids = [];
        $(this).find('li').each(function(i) {
          var $li = $(this);
          ids.push($li.data('id'));
        });
        
        $(this).sortable('cancel');
        
        that.get('controller').send('sort', ids);
      }
    });
  }
});

App.TasksView = Ember.View.extend({
  sEvent: null,
  
  didInsertElement: function(event) {
    var that = this;
    var controller = that.get('controller');
    
    this.$().find("ul.tasks").sortable({
      connectWith: "ul.tasks",
      cursor: "move",
      
      update: function(event, ui) {
        var ids = [];
        $(this).find('li').each(function() {
          var $li = $(this);
          var id = $li.data('id');
          if (id) { ids.push(id); }
        });
        
        // as we have a helper from drop function
        // we don't want the same id to be mentioned twice
        var uniqueIds = [];
        for(var i = 0; i < ids.length; ++i) {
          var id = ids[i];
          if (uniqueIds.indexOf(id) === -1) {
            uniqueIds.push(id);
          }
        }
        
        $(this).sortable('cancel');
      
        controller.send('sort', uniqueIds);
      },
      
      receive: function(event, ui) {
        controller.send('receive', ui.item.data('id'));
      },
      
      remove: function(event, ui) {
        controller.send('remove', ui.item.data('id'));
      },
      
      end: function() {
        $(this).find('.js-drop-to').remove();
      }
    });
    
    this.$().find('ul.tasks').droppable({
      drop: function(e, ui) {
        // placing a temporary helper for multi-column drag and drop
        var $dropNotifier = $('<li class="js-drop-to" style="display:none;"></li>');
        $dropNotifier.data('id', ui.draggable.data('id'));
        $dropNotifier.insertBefore($(this).children('.ui-sortable-placeholder'))
      }
    });
    
    this.$().find("input").on('keypress', function(e) {
      if (e.which == 13) {
        var val = $(this).val();
        if ($.trim(val).length > 0) {
          controller.send('createTask', val);
        }
        return false;
      }
    });
  }
});

/** Controllers
 */

App.ApplicationController = Ember.ArrayController.extend({
  columnName: '',
  sortProperties: ["rank"],
  actions: {
    createColumn: function(name) {
      var last = this.get('lastObject');
      var nextRank;
      if (last) {
        nextRank = (last.get('rank') || 1) + 1
      } else {
        nextRank = 1;
      }
      
      var column = this.store.createRecord('column', {
        name: name,
        rank: nextRank,
        tasks: []
      });
      
      var controller = this;
      column.save().then(function() {
        controller.set('columnName', '')
      });
    },
    
    sort: function(ids) {
      var controller = this;
      $.each(ids, function(rank) {
        var id = this.toString();
        controller.store.find('column', id).then(function(record) {
          record.set('rank', rank);
          record.save();
        });
      });
    },
    
    delete: function(record) {
      record.destroyRecord();
    }
  }
});

App.ColumnController = Ember.ObjectController.extend({
});

App.TasksController = Ember.ArrayController.extend({
  sortProperties: ["rank"],
  column: Ember.computed.alias("parentController.content"),
  actions: {
    createTask: function(name) {
      var columnId = this.parentController.get("id");
      var last = this.get('lastObject');
      var nextRank;
      if (last) {
        nextRank = (last.get('rank') || 1) + 1
      } else {
        nextRank = 1;
      }

      var controller = this;
      var column = this.get("column");
      
      var task = this.store.createRecord('task', {
        name: name,
        rank: nextRank,
        column: column
      });

      task.save().then(function() {
        column.get("tasks").pushObject(task);
        controller.set('taskName', '');
      });
    },
    
    sort: function(ids) {
      var controller = this;

      $.each(ids, function(rank) {
        var id = this.toString();
        controller.store.find('task', id).then(function(record) {
          var columnId = controller.get('column.id');
          var recordColumnId = record.get('column.id');
          
          record.set('rank', rank);
          record.save()
        });
      });
    },
    
    receive: function(id) {
      var controller = this;
      controller.store.find('task', id).then(function(record) {
        record.set('column', controller.get('column'));
        record.save().then(function() {
          controller.get('model').pushObject(record);
        });
      });
    },
    
    remove: function(id) {
      var controller = this;
      controller.store.find('task', id).then(function(record) {
        controller.get('model').removeObject(record);
      });
    }
  }
});

App.IndexController = Ember.ArrayController.extend({
  sortProperties: ["rank"]
});

/** Models
 */

App.ApplicationAdapter = DS.FixtureAdapter.extend({});

App.Column = DS.Model.extend({
  name: DS.attr('string'),
  rank: DS.attr('number'),
  tasks: DS.hasMany('task', {async: true})
});

App.Task = DS.Model.extend({
  name: DS.attr('string'),
  rank: DS.attr('number'),
  column: DS.belongsTo('column', {async: true}),
  columnId: Ember.computed.alias("column.id")
});

/** Fixtures
  */

App.Column.FIXTURES = [
  {
    id: 1,
    name: "TODO",
    rank: 1,
    tasks: [1, 2]
  },
  {
    id: 2,
    name: "Done",
    rank: 2,
    tasks: [3, 4]
  }
];

App.Task.FIXTURES = [
{id:1, name: "test 1", column: 1, rank: 0},
{id:2, name: "test 2", column: 1, rank: 1},
{id:3, name: "test 3", column: 2, rank: 0},
{id:4, name: "test 4", column: 2, rank: 1},
];