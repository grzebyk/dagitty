

var DAGittyGraphView = Class.create({
	setStyle : function( sheetname ){
		this.impl && this.impl.setStyle( sheetname )
	},
	getStyle : function(){
		if( this.impl ){
			return this.impl.getStyle()
		} else {
			return undefined;
		}
	},
	getGraph : function(){
		return this.graph;
	},
	setGraph : function( graph ){
		this.setCoordinateSystemValid( false );
		this.graph=graph;
	},
	getContainer : function(){
		return this.container;
	},
	setContainer : function( container ){
		this.container=container;
	},
	getController : function(){
		return this.controller;
	},
	setController : function( controller ){
		this.controller=controller;
	},
	getCurrentVertex : function(){
		if( this.impl.element_in_focus &&
			!this.impl.element_in_focus.v1 ){
			var v = this.getGraph().getVertex( this.impl.element_in_focus.id );
			return v || undefined;
		}
		return undefined;
	},
	getCurrentEdgeShape : function(){
		if( this.impl.element_in_focus &&
			this.impl.element_in_focus.v1 ){
			return this.impl.element_in_focus;
		}
		return undefined;
	},
	startDragging : function(){
		this.startDraggingVertex();
		this.startDraggingEdgeShape();
	},
	startDraggingEdgeShape : function(){
		var es = this.getCurrentEdgeShape();
		if( es ){
			this.edge_shape_being_dragged = es;
		}
	},
	stopDragging : function(){
		delete this.vertex_being_dragged;
		delete this.edge_shape_being_dragged;
	},
	isDraggingEdgeShape : function(){
		return this.edge_shape_being_dragged;
	},
	startDraggingVertex : function(){
		var v = this.getCurrentVertex();
		if( v ){
			this.vertex_being_dragged = v;
		}
	},
	isDraggingVertex : function(){
		return this.vertex_being_dragged;
	},
	dblclickHandler : function( e ){
		var v = this.getCurrentVertex();
		var es = this.getCurrentEdgeShape();
		if( v ){
			this.connectVertex(); 
		} else if( es ){
			delete es.cx
			delete es.cy
				// TODO this presumes at most 1 edge between vertex shapes
			var e = this.graph.getEdge( es.v1.id, es.v2.id )
			delete e.layout_pos_x
			delete e.layout_pos_y
			this.impl.anchorEdgeShape( es )
		} else {
			this.newVertexDialog();
		}
	},
	clickHandler : function( e ){
		if( this.action_on_click ){
			if( typeof this.action_on_click !== "function" ){
				this.keydownhandler( {keyCode:this.action_on_click} );
			} else {
				this.action_on_click.apply( this );
			}
		}
	},
	setActionOnClick : function( a ){
		if( typeof a === "function" ){
			this.action_on_click = a; return
		}
		switch( a ){
			case "a":
			case 65:
				this.action_on_click = 65;
				break;
			case "c":
			case 67:
				this.action_on_click = 67;
				break;
			case "e":
				case 69: 
				this.action_on_click = 69;
				break;
			case "e":
			case 82:		
				this.action_on_click = 82;
				break;
			case "u":
			case 85:
				this.action_on_click = 85;
				break;
			case "o":
			case 79:
				this.action_on_click = 79;
				break;
			case "del":
			case 46:
				this.action_on_click = 46;
				break;
			case "n":
			case 78:
				this.action_on_click = 78;
				break;
			break;
		}
	},
	registerEventListeners : function( autofocus ){
		/* register event handlers on canvas */
		var myself = this;
		var movehandler = function(e){
			if( myself.dialogOpen() ){ return; };
			myself.mouse_x = Event.pointerX(e)-myself.getContainer().offsetLeft;
			myself.mouse_y = Event.pointerY(e)-myself.getContainer().offsetTop;
			var v = myself.isDraggingVertex();
			if( v ){ // is a vertex
				myself.unmarkVertex();
				myself.impl.suspendRedraw( 5000 );
				var vs = myself.vertex_shapes.get( v.id );
				vs.x = myself.mouse_x;
				vs.y = myself.mouse_y;
				myself.impl.moveVertexShape( vs );
				vs.adjacent_edges.each(function(es){
					myself.impl.anchorEdgeShape( es );
				});
				var g_coords = myself.toGraphCoordinate( vs.x, vs.y );
				
				v.layout_pos_x = g_coords[0]; // changes model
				v.layout_pos_y = g_coords[1]; // changes model
				
				myself.graph_layout_changed = true;
				
				myself.impl.unsuspendRedraw();
			}
			var es = myself.isDraggingEdgeShape();
			if( es ){ // is an edge
				myself.impl.suspendRedraw( 5000 );

				var e = myself.graph.getEdge( 
					myself.graph.getVertex( es.v1.id ),
					myself.graph.getVertex( es.v2.id )
				);
				
				var g_coords = myself.toGraphCoordinate( myself.mouse_x,
					myself.mouse_y );
				e.layout_pos_x = g_coords[0]; // changes model
				e.layout_pos_y = g_coords[1]; // changes model

				es.cx = myself.mouse_x;
				es.cy = myself.mouse_y;
				myself.impl.anchorEdgeShape( es );
				
				myself.graph_layout_changed = true;
				
				myself.impl.unsuspendRedraw();
			}
		}
		
		Event.observe( this.getContainer(), 'mousedown', function(e){
			myself.startDragging();
		} );
		
		Event.observe( this.getContainer(), 'dblclick', function(e){
			myself.dblclickHandler( e );
		} );
		
		Event.observe( this.getContainer(), 'click', function( e ){
			myself.clickHandler( e );
		} );
		
		Event.observe( this.getContainer(), 'mousemove', movehandler );
		
		Event.observe( this.getContainer(), 'mouseup', function(e){
			if( myself.graph_layout_changed ){
				myself.getController().graphLayoutChanged();
				myself.graph_layout_changed = false;
			}
			myself.stopDragging();
		} );
		if( autofocus ){
			Event.observe( this.getContainer(), 'mouseenter', function(e){
				myself.getContainer().focus();
			} );
		}
		
		this.keydownhandler = function( e ){
			var v = myself.getCurrentVertex();
			switch( e.keyCode ){
			    case 65: //a
					if(v) myself.getController().toggleVertexProperty(v,"adjustedNode");
					break;
			    case 67: //c
					myself.connectVertex();
					break;
			    case 69: //e
					if(v) myself.getController().toggleVertexProperty(v,"source");
					break;
			    case 82: //r
					if(v){
						myself.renameVertexDialog();
						Event.stop(e);
					}
					break;
				case 85: //u
					if(v) myself.getController().toggleVertexProperty(v,"latentNode");
					break;
			    case 79: //o
					if(v) myself.getController().toggleVertexProperty(v,"target");
					break;
			    case 46: //del
			    case 68: //d
					if(v) myself.getController().deleteVertex(v);
					break;
				case 78: //n
					myself.newVertexDialog();
					Event.stop(e);
					break;
				break;
			}
		};
		Event.observe( this.getContainer(), 'keydown', this.keydownhandler );
	},
	initialize : function( el, graph, controller, obj ){
		// el -> parent element to hook into
		// graph -> graph object to use (model)
		// controller -> controller to send commands to 
		// obj -> further options
		//    autofocus -> if true, will set an event handler giving
		//                 focus to the container on mouse entry
		//    action_on_click -> which key code to emulate upon mouseclick, or a function
		//						 to execute.
		
		this.setContainer(el);
		this.setGraph(graph);
		this.setController(controller);
		
		var c = this.getContainer();
		
		c.style.userSelect = "none";
		c.style.whiteSpace="normal";
		c.style.textAlign="center";
		this.width = c.offsetWidth-4;
		this.height = c.offsetHeight-4;
		c.setAttribute("tabindex",0);

		c.style.WebkitUserSelect = "none";
		c.style.MozUserSelect = "none";
		c.style.MsUserSelect = "none";
		c.style.UserSelect = "none";
		
		if( getComputedStyle( c ).getPropertyValue("position") != "absolute" ){
			c.style.position = "relative";
		}
		
		el.innerHTML = "";
		var impl = new GraphGUI_SVG( c, this.width, this.height );
		this.impl = impl;
		
		this.registerEventListeners( obj?obj.autofocus:false );
		
		if( obj && obj.action_on_click ){
			this.setActionOnClick( obj.action_on_click );
		}
		
		this.display_mode = "normal";
		this.vertex_shapes = new Hash();
		this.edge_shapes = [];

		this.drawGraph();
	},
	resize : function(){
		this.setCoordinateSystemValid( false );
		this.width = this.getContainer().offsetWidth-4; 
		this.height = this.getContainer().offsetHeight-4;;
		this.impl.resize( this.width, this.height );
		this.drawGraph();
	},
	markVertex : function( v ){
		var vs = this.vertex_shapes.get(v.id);
		if( vs ){
			this.impl.markVertexShape(vs);
			this.setMarkedVertex(v);
		}
	},
	unmarkVertex : function( v ){
		if( !v ){
			v = this.marked_vertex;
		}
		if( v ){
			var vs = this.vertex_shapes.get(v.id);
			if( vs ){
				this.impl.unmarkVertexShape(vs);
				delete this.marked_vertex;
			}
		}
	},
	setMarkedVertex : function( v ){
		this.marked_vertex = v;
	},
	getMarkedVertex : function(){
		return this.marked_vertex;
	},
	getViewMode : function(){
		return this.view_mode;
	},
	setViewMode : function( m ){
		this.view_mode = m;
		this.drawGraph();
	},
	connectVertex : function(){
		if( this.dialogOpen() ){ return; };
		var v = this.getCurrentVertex()
		var v2 = this.getMarkedVertex()
		if( v ){
			if( v2 ){
				if( v2 !== v ){
					this.getController().toggleEdge( v2, v );
				}
				this.unmarkVertex( v2 )
			} else {
				this.markVertex( v )
			}
		}

	},
	newVertex : function( n ){
		if( !n ){
			this.dialogErrorMessage( "Please enter the variable name!");
			return;
		};
		// sanitize
		n = n.replace(/^\s+|\s+$/g,'').replace( /\s+/g, '_' );
		var v = this.graph.getVertex( n );
		if( v ){
			this.dialogErrorMessage( "The variable "+n+" already exists!");
			return;
		};
		var g_coords = this.toGraphCoordinate( this.mouse_x, this.mouse_y );
		this.getController().newVertex( n, g_coords[0], g_coords[1] );
		this.closeDialog();
	},
	renameVertex : function( n ){
		if( !n ){
			this.dialogErrorMessage( "Please enter the variable name!");
			return;
		};
		var v = this.current_dialog.vertex;
		// sanitize
		n.replace( /\s+/, '_' );
		if( !v || (n === v.id) ){ return; };
		if( this.getGraph().getVertex( n ) ){
			this.dialogErrorMessage( "The variable "+n+" already exists!");
			return;
		};
		this.getController().renameVertex( v.id, n );
		this.closeDialog();
	},
	closeDialog : function(){
		if( this.current_dialog ){
			this.getContainer().removeChild( this.current_dialog.dom );
			this.getContainer().focus();
			if( this.dialogkeydownhandler ){
				Event.stopObserving(this.getContainer(),'keydown',
					this.dialogkeydownhandler);
				delete this.dialogkeydownhandler;
			}
			Event.observe(this.getContainer(),'keydown',this.keydownhandler);
		}
		delete this.current_dialog;
	},
	// This is meant to display an error message in an already open
	// dialog.
	dialogErrorMessage : function( m ){
		if( this.current_dialog ){
			this.current_dialog.error_message_field.innerHTML = m;
		}
	},
	openHTMLDialog : function(h, button_text){
		this.closeDialog();
		var el = function(n){return document.createElement(n);};
		var txt = function(el,t){el.appendChild( document.createTextNode(t) ) };
		var myself = this;
		var qdiv = el( 'div' );
		qdiv.className='dialogwin';
		qdiv.appendChild( el('p') );
		var qform = el( 'form' );
		qform.setAttribute( 'name', 'newvertexform' );
		qform.onsubmit = function(){return false;}
		var qf = el('p');
		qf.innerHTML = h
		qform.appendChild(qf);
		if( button_text ){
			qform.appendChild(el('br'));
			var qf = el('button');
			txt(qf,'OK');
			qf.onclick = function(){myself.closeDialog();};
			qform.appendChild(document.createTextNode(" "));
			qform.appendChild(qf);
		}
		qdiv.appendChild(qform);
		this.getContainer().appendChild( qdiv );
		this.current_dialog = { 
			dom : qdiv
		};
		// unregister & save previous keydown handler
		Event.stopObserving(this.getContainer(),'keydown',this.keydownhandler);
	},
	openAlertDialog : function(t){
		this.closeDialog();
		var el = function(n){return document.createElement(n);};
		var txt = function(el,t){el.appendChild( document.createTextNode(t) ) };
		var myself = this;
		var qdiv = el( 'div' );
		qdiv.className='dialogwin';
		qdiv.appendChild( el('p') );
		var qform = el( 'form' );
		qform.setAttribute( 'name', 'newvertexform' );
		qform.onsubmit = function(){return false;}
		var qf = el('p');
		txt(qf,t);
		qform.appendChild(qf);
		qform.appendChild(el('br'));
		var qf = el('button');
		txt(qf,'OK');
		qf.onclick = function(){myself.closeDialog();};
		qform.appendChild(document.createTextNode(" "));
		qform.appendChild(qf);
		qdiv.appendChild(qform);
		this.getContainer().appendChild( qdiv );
		this.current_dialog = { 
			dom : qdiv
		};
		// unregister & save previous keydown handler
		Event.stopObserving(this.getContainer(),'keydown',this.keydownhandler);
		this.dialogkeydownhandler = qf.onclick;
		Event.observe(this.getContainer(),'keydown',this.dialogkeydownhandler);
	},
	// t : text ; v : default value ; f : callback when clicked "OK"
	openPromptDialog : function(t,v,f){
		this.closeDialog();
		var el = function(n){return document.createElement(n);};
		var txt = function(el,t){el.appendChild( document.createTextNode(t) ) };
		var myself = this;
		var qdiv = el( 'div' );
		qdiv.className='dialogwin';
		qdiv.style.width='100%';
		qdiv.style.height='100%';
		qdiv.style.position='absolute';
		qdiv.style.backgroundColor='#999';
		qdiv.style.textAlign='center';
		qdiv.style.top='0px';
		qdiv.style.left='0px';
		qdiv.style.opacity='.9';
		
		qdiv.appendChild( el('p') );
		var qform = el( 'form' );
		qform.setAttribute( 'name', 'newvertexform' );
		qform.onsubmit = function(){return false;}
		var qf = el('label');
		qf.style.fontFamily = 'sans-serif';
		qf.setAttribute('for','vertexname');
		txt(qf,t);
		qform.appendChild(qf);
		qform.appendChild(el('br'));
		qfin = el('input');
		qfin.setAttribute( 'type', 'text' );
		qfin.setAttribute( 'size', 30 );
		qfin.setAttribute( 'maxlength', 255 );
		qfin.setAttribute( 'value', v );
		qform.appendChild(qfin);
		qform.appendChild(el('br'));
		var qferr = el('span');
		qferr.className='err';
		qform.appendChild( qferr );
		qform.appendChild(el('br'));
		var qf = el('button');
		txt(qf,'OK');
		qf.onclick = function(){ 
			f.call(myself,qfin.value);
		};
		qform.appendChild(qf);
		qf = el('button');
		txt(qf,'Cancel');
		qf.onclick = function(){myself.closeDialog();};
		qform.appendChild(document.createTextNode(" "));
		qform.appendChild(qf);
		qdiv.appendChild(qform);
		this.getContainer().appendChild( qdiv );
		this.current_dialog = { 
			dom : qdiv,
			error_message_field : qferr
		};
		// unregister & save previous keydown handler
		Event.stopObserving(this.getContainer(),'keydown',this.keydownhandler);
		qfin.focus();
	},
	dialogOpen : function(){
		return this.current_dialog !== undefined;
	},
	newVertexDialog : function(){
		if( !this.dialogOpen() ){
			this.openPromptDialog( 'name of the new variable:', '', this.newVertex );
		}
	},
	renameVertexDialog : function(){
		var v = this.getCurrentVertex();
		if( !this.dialogOpen() && v ){
			this.openPromptDialog( 'rename variable:', v.id, this.renameVertex );
			this.current_dialog.vertex = v;
		}
	},
	isCoordinateSystemValid : function(){
		return this.coordinate_system_valid;
	},
	setCoordinateSystemValid : function(b){
		this.coordinate_system_valid = b;
	},
	initializeCoordinateSystem : function( g ){
		if( this.isCoordinateSystemValid() ){ return; }
		var min_x = Infinity, max_x = -Infinity, min_y = Infinity, max_y = -Infinity;
		var vv = g.getVertices();
		for( var i = 0 ; i < vv.length ; i ++ ){
			min_x = vv[i].layout_pos_x < min_x ? vv[i].layout_pos_x : min_x;
			min_y = vv[i].layout_pos_y < min_y ? vv[i].layout_pos_y : min_y;
			max_x = vv[i].layout_pos_x > max_x ? vv[i].layout_pos_x : max_x;
			max_y = vv[i].layout_pos_y > max_y ? vv[i].layout_pos_y : max_y;
		}
		if( max_x == min_x ){ max_x = min_x + 1; }
		if( max_y == min_y ){ max_y = min_y + 1; }
		xpad=50/this.width*(max_x-min_x);
		ypad=80/this.height*(max_y-min_y);
		this.bounds = [min_x-xpad,max_x+xpad,min_y-ypad,max_y+ypad];
		this.setCoordinateSystemValid( true );
	},
	toScreenCoordinate : function( x, y ){
		return [(x-this.bounds[0])/(this.bounds[1]-this.bounds[0])*this.width,
			(y-this.bounds[2])/(this.bounds[3]-this.bounds[2])*this.height];
	},
	toGraphCoordinate : function( x, y ){
		return [x/this.width*(this.bounds[1]-this.bounds[0])+this.bounds[0],
			y/this.height*(this.bounds[3]-this.bounds[2])+this.bounds[2]];
	},
	drawGraph : function(){
		var g;
		var g_causal = new Graph();
		var g_bias = new Graph();
		var g_trr = new Graph();

		var g_an = GraphTransformer.ancestorGraph(
				GraphTransformer.backDoorGraph(
					this.getGraph() ) );
		var myself = this;

		switch( this.view_mode ){
			case "moral" : 
				if( this.graph.getSources().length > 0 && this.graph.getTargets().length > 0 ){
					g = GraphTransformer.moralGraph( g_an )
				} else {
					g = new Graph();
				}
				break;
			case "dependency" : 
				g = GraphTransformer.dependencyGraph( this.getGraph() );
				break;
			default:
				g = this.getGraph();
				g_trr = GraphTransformer.transitiveReduction( g );
				if( g.getSources().length > 0 && g.getTargets().length > 0 ){
					g_causal = GraphTransformer.causalFlowGraph(g);
					g_bias = GraphTransformer.activeBiasGraph(g);
				}
		}

		this.initializeCoordinateSystem( g );
		
		var vv = g.getVertices();
		this.impl.suspendRedraw( 50000 );
		this.impl.removeShapes( this.edge_shapes );
		this.impl.removeShapes( this.vertex_shapes.values() );
		this.edge_shapes = [];
		this.vertex_shapes = new Hash();
		
		var e_ancestors = g_an.ancestorsOf( g_an.getSources() );
		var o_ancestors = g_an.ancestorsOf( g_an.getTargets() );
		
		var ean_ids = {};
		e_ancestors.each(function(v){ean_ids[v.id]=1});
		var oan_ids = {};
		o_ancestors.each(function(v){oan_ids[v.id]=1});

		for( var i = 0 ; i < vv.length ; i ++ ){
			var c = this.toScreenCoordinate( vv[i].layout_pos_x, vv[i].layout_pos_y );
			var vs = { id: vv[i].id, x : c[0], y : c[1], adjacent_edges : [] };

			var e_an = e_ancestors.include( vv[i] );
			var o_an = e_ancestors.include( vv[i] );

			var vertex_type = "";			
			if( g.isSource(vv[i]) ){
				vertex_type = "exposure";
			} else if( g.isTarget(vv[i]) ){
				vertex_type = "outcome";
			} else if( g.isAdjustedNode(vv[i]) ){
				vertex_type = "adjusted";
			} else if( g.isLatentNode(vv[i]) ){
				vertex_type = "latent";
			} else if( ean_ids[vv[i].id]
				&& oan_ids[vv[i].id] ){
				vertex_type = "confounder";
			} else if( ean_ids[vv[i].id] ){
				vertex_type = "anexposure";
			} else if( oan_ids[vv[i].id] ){
				vertex_type = "anoutcome";
			}
			
			this.impl.createVertexShape( vertex_type, vs );
			this.vertex_shapes.set( vv[i].id, vs );
		}
		this.impl.appendShapes( this.vertex_shapes.values() );
		this.impl.appendTextBackgrounds( this.vertex_shapes.values() );
		
		var ee = g.getEdges();
		for( var i = 0 ; i < ee.length ; i ++ ){
			var c = this.toScreenCoordinate( ee[i].v1.layout_pos_x, ee[i].v1.layout_pos_y ); 
			var c2 = this.toScreenCoordinate( ee[i].v2.layout_pos_x, ee[i].v2.layout_pos_y ); 
			
			var es = { 
				v1 : this.vertex_shapes.get( ee[i].v1.id ), 
				v2 : this.vertex_shapes.get( ee[i].v2.id )
			};

			if( ee[i].layout_pos_x ){
				var s_coord = this.toScreenCoordinate( ee[i].layout_pos_x,
					ee[i].layout_pos_y );
				es.cx = s_coord[0];
				es.cy = s_coord[1];
			}

			var edgetypes = []
			switch( ee[i].directed ){
				case 0 : edgetypes.push("undirected")
					break
				case 1 : edgetypes.push("directed")
						break
				case 2 : edgetypes.push("bidirected")
						break
			}

			if( g_causal.getEdge( ee[i].v1, ee[i].v2, ee[i].directed ) ){
				edgetypes.push( "causal" )
			}
			
			if( g_bias.getEdge( ee[i].v1, ee[i].v2, ee[i].directed ) ){
				edgetypes.push( "biasing" )
			}

			if( g_trr.getEdge( ee[i].v1, ee[i].v2 ) ){
				edgetypes.push( "puredirect" )
			}
			
			this.impl.createEdgeShape( edgetypes.join(" "), es )
			this.edge_shapes.push( es );
			es.v1.adjacent_edges.push( es );
			es.v2.adjacent_edges.push( es );
		}
		this.impl.prependShapes( this.edge_shapes );
		this.impl.unsuspendRedraw();

	}
});
