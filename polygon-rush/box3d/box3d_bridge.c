#include <stdint.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
#include <box3d/box3d.h>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define API EMSCRIPTEN_KEEPALIVE
#else
#define API
#endif

typedef struct { b3BodyId id; int used; int tag; } BodySlot;
typedef struct { b3WorldId id; int used; } WorldSlot;
static BodySlot g_bodies[1024];
static WorldSlot g_worlds[8];
static float g_state_buf[7];
static float g_contact_buf[1 + 128 * 8];
static int alloc_world(b3WorldId id){ for(int i=1;i<8;i++){ if(!g_worlds[i].used){ g_worlds[i].used=1; g_worlds[i].id=id; return i; } } return 0; }
static b3WorldId world_id(int h){ return (h>0&&h<8&&g_worlds[h].used)?g_worlds[h].id:b3_nullWorldId; }
static int alloc_body(b3BodyId id,int tag){ for(int i=1;i<1024;i++){ if(!g_bodies[i].used){ g_bodies[i].used=1; g_bodies[i].id=id; g_bodies[i].tag=tag; return i; } } return 0; }
static b3BodyId body_id(int h){ return (h>0&&h<1024&&g_bodies[h].used)?g_bodies[h].id:b3_nullBodyId; }
static int find_body_handle(b3BodyId id){ for(int i=1;i<1024;i++) if(g_bodies[i].used && B3_ID_EQUALS(g_bodies[i].id,id)) return i; return 0; }
static int body_tag_from_id(b3BodyId id){ int h=find_body_handle(id); return h?g_bodies[h].tag:0; }

API int pr_b3_create_world(void){ b3WorldDef wd=b3DefaultWorldDef(); wd.gravity=(b3Vec3){0.0f,-9.81f,0.0f}; wd.enableContinuous=true; wd.hitEventThreshold=1.5f; b3WorldId id=b3CreateWorld(&wd); return alloc_world(id); }
API int pr_b3_create_vehicle(int worldHandle,float x,float y,float z,float yaw){ b3WorldId world=world_id(worldHandle); if(B3_IS_NULL(world)) return 0; b3BodyDef bd=b3DefaultBodyDef(); bd.type=b3_dynamicBody; bd.position=(b3Pos){x,y,z}; bd.rotation=b3MakeQuatFromAxisAngle(b3Vec3_axisY,yaw); bd.linearDamping=0.14f; bd.angularDamping=2.85f; bd.enableSleep=false; b3BodyId body=b3CreateBody(world,&bd); b3BoxHull hull=b3MakeBoxHull(1.35f,0.62f,2.15f); b3ShapeDef sd=b3DefaultShapeDef(); sd.density=115.0f; sd.baseMaterial.friction=0.48f; sd.baseMaterial.restitution=0.0f; sd.enableContactEvents=true; sd.enableHitEvents=true; b3CreateHullShape(body,&sd,&hull.base); return alloc_body(body,1); }
API int pr_b3_create_static_box(int worldHandle,float x,float y,float z,float hx,float hy,float hz,float yaw,int tag){ b3WorldId world=world_id(worldHandle); if(B3_IS_NULL(world)) return 0; b3BodyDef bd=b3DefaultBodyDef(); bd.type=b3_staticBody; bd.position=(b3Pos){x,y,z}; bd.rotation=b3MakeQuatFromAxisAngle(b3Vec3_axisY,yaw); b3BodyId body=b3CreateBody(world,&bd); b3BoxHull hull=b3MakeBoxHull(hx,hy,hz); b3ShapeDef sd=b3DefaultShapeDef(); sd.baseMaterial.friction=0.65f; sd.baseMaterial.restitution=0.02f; b3CreateHullShape(body,&sd,&hull.base); return alloc_body(body,tag); }
API void pr_b3_destroy_body(int worldHandle,int bodyHandle){ (void)worldHandle; if(bodyHandle<=0||bodyHandle>=1024||!g_bodies[bodyHandle].used)return; b3DestroyBody(g_bodies[bodyHandle].id); g_bodies[bodyHandle].used=0; }
API void pr_b3_step(int worldHandle,float dt,int subSteps){ b3WorldId world=world_id(worldHandle); if(B3_IS_NULL(world)) return; b3World_Step(world,dt,subSteps); }
API void pr_b3_apply_vehicle_control(int worldHandle,int bodyHandle,float throttle,float brake,float steer,float handbrake,float nitro,float grip,float forwardSpeed){ (void)worldHandle; b3BodyId body=body_id(bodyHandle); if(B3_IS_NULL(body))return; b3Quat q=b3Body_GetRotation(body); b3Vec3 forward=b3RotateVector(q,b3Vec3_axisZ); b3Vec3 right=b3RotateVector(q,b3Vec3_axisX); b3Vec3 v=b3Body_GetLinearVelocity(body); float engine=10500.0f*(nitro>0.5f?1.25f:1.0f)*throttle; float braking=14500.0f*brake; b3Vec3 force=b3MulSV(engine,forward); if(fabsf(forwardSpeed)>0.5f && brake>0.0f){ force=b3Sub(force,b3MulSV(braking*(forwardSpeed>0?1.0f:-1.0f),forward)); } float lateral=b3Dot(v,right); float latDamp=(handbrake>0.1f?0.95f:6.0f)*grip; force=b3Sub(force,b3MulSV(lateral*1750.0f*latDamp,right)); b3Body_ApplyForceToCenter(body,force,true); float steerScale=fminf(fabsf(forwardSpeed)/8.0f,1.0f); float yawTorque=steer*steerScale*4300.0f*(handbrake>0.1f?1.20f:1.0f); b3Body_ApplyTorque(body,(b3Vec3){0,yawTorque,0},true); }
API float* pr_b3_get_body_state(int worldHandle,int bodyHandle){ (void)worldHandle; b3BodyId body=body_id(bodyHandle); if(B3_IS_NULL(body))return 0; b3Pos p=b3Body_GetPosition(body); b3Vec3 v=b3Body_GetLinearVelocity(body); b3Quat q=b3Body_GetRotation(body); b3Vec3 forward=b3RotateVector(q,b3Vec3_axisZ); float yaw=b3Atan2(forward.x,forward.z); g_state_buf[0]=p.x;g_state_buf[1]=p.y;g_state_buf[2]=p.z; g_state_buf[3]=v.x;g_state_buf[4]=v.y;g_state_buf[5]=v.z; g_state_buf[6]=yaw; return g_state_buf; }
API float* pr_b3_get_contacts(int worldHandle){ b3WorldId world=world_id(worldHandle); if(B3_IS_NULL(world))return 0; b3ContactEvents events=b3World_GetContactEvents(world); int count=events.hitCount; if(count>128)count=128; memset(g_contact_buf,0,sizeof(g_contact_buf)); int32_t* i32=(int32_t*)g_contact_buf; i32[0]=count; int off=1; for(int i=0;i<count;i++){ const b3ContactHitEvent* hit=events.hitEvents+i; b3BodyId ba=b3Shape_GetBody(hit->shapeIdA); b3BodyId bb=b3Shape_GetBody(hit->shapeIdB); int ha=find_body_handle(ba),hb=find_body_handle(bb); i32[off++]=ha; i32[off++]=hb; i32[off++]=body_tag_from_id(ba); i32[off++]=body_tag_from_id(bb); g_contact_buf[off++]=hit->approachSpeed; g_contact_buf[off++]=hit->normal.x; g_contact_buf[off++]=hit->normal.y; g_contact_buf[off++]=hit->normal.z; } return g_contact_buf; }
API void pr_b3_free_state(float* p){ (void)p; }
API void pr_b3_free_contacts(float* p){ (void)p; }
